/* Krewe of Shamrock — shared QR generator (Phase 1 of QR_LIBRARY_BUILD_PLAN.md).
   The one place that draws QR squares. Every studio calls kosQR instead of
   keeping its own copy, so colors, the download button, the print card, and
   the library-missing fallback stay consistent everywhere.

   Depends on the self-hosted qrcode library (assets/vendor/qrcode.min.js)
   exposing window.QRCode; every entry point degrades to a plain link when
   that library is unavailable. */
(function () {
  "use strict";

  var COLORS = { dark: "#14532d", light: "#ffffff" };
  var FALLBACK = "QR library unavailable — use the link.";

  function esc(v) {
    return (v == null ? "" : String(v)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function slugify(s) {
    var out = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    return out || "krewe-qr";
  }

  /* Draw onto an existing <canvas>. Returns false when the library is missing
     so the caller can show its own fallback (used by the raffle print sheet). */
  function draw(canvas, url, width) {
    if (!window.QRCode || !canvas || !url) return false;
    QRCode.toCanvas(canvas, url, { width: width || 220, margin: 1, color: COLORS });
    return true;
  }

  /* High-resolution PNG download, for flyers, Canva, and slides. */
  function downloadPNG(url, name) {
    if (!window.QRCode) {
      alert(FALLBACK.replace("use", "copy"));
      return;
    }
    QRCode.toDataURL(url, { width: 600, margin: 1, color: COLORS }, function (err, dataUrl) {
      if (err || !dataUrl) {
        alert("Could not make the PNG. Copy the link instead.");
        return;
      }
      var a = document.createElement("a");
      a.href = dataUrl;
      a.download = slugify(name) + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  /* Print-ready card in a new tab: title, subtitle, square, scan line —
     the raffle-sheet card layout, for any single QR code. */
  function printCard(title, sub, url) {
    if (!window.QRCode) {
      alert(FALLBACK.replace("use", "copy"));
      return;
    }
    QRCode.toDataURL(url, { width: 600, margin: 1, color: { dark: "#0c3b21", light: "#ffffff" } }, function (err, dataUrl) {
      if (err || !dataUrl) {
        alert("Could not make the print card. Copy the link instead.");
        return;
      }
      var w = window.open("", "_blank");
      if (!w) {
        alert("Pop-up blocked. Allow pop-ups for this site to print QR cards.");
        return;
      }
      w.document.write(
        "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\" /><title>" + esc(title || "Krewe QR code") + "</title>" +
        "<style>body{font-family:Georgia,serif;text-align:center;margin:40px auto;max-width:420px;}" +
        ".card{border:2px solid #14532d;border-radius:16px;padding:24px;}" +
        "h1{color:#14532d;font-size:26px;margin:0 0 4px;}" +
        ".sub{color:#7a1f2b;font-size:15px;margin:0 0 14px;}" +
        "img{width:280px;height:280px;}" +
        ".scan{color:#14532d;font-size:16px;margin-top:10px;}" +
        ".url{font-size:11px;color:#666;word-break:break-all;margin-top:12px;}</style></head><body>" +
        "<div class=\"card\"><h1>" + esc(title || "Scan me") + "</h1>" +
        (sub ? "<p class=\"sub\">" + esc(sub) + "</p>" : "") +
        "<img alt=\"QR code\" src=\"" + dataUrl + "\" />" +
        "<div class=\"scan\">📷 Scan with your phone camera</div>" +
        "<div class=\"url\">" + esc(url) + "</div></div>" +
        "<script>window.onload=function(){window.print();};<\/script></body></html>"
      );
      w.document.close();
    });
  }

  /* Standard studio slot: square + labelled link + Download PNG + Print card,
     or the one shared fallback message when the library is missing. */
  function paint(slot, url, label) {
    if (!slot || !url) return;
    slot.innerHTML =
      "<canvas></canvas>" +
      '<div style="font-size:14px;color:var(--muted);margin-top:6px;word-break:break-all;">' +
      esc(label || "Scan or open") + ': <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + "</a></div>";
    var canvas = slot.querySelector("canvas");
    if (!draw(canvas, url)) {
      canvas.replaceWith(Object.assign(document.createElement("p"), { textContent: FALLBACK }));
      return;
    }
    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;";
    var dl = document.createElement("button");
    dl.type = "button";
    dl.className = "btn";
    dl.textContent = "⬇ Download PNG";
    dl.onclick = function () { downloadPNG(url, label); };
    var pr = document.createElement("button");
    pr.type = "button";
    pr.className = "btn";
    pr.textContent = "🖨️ Print card";
    pr.onclick = function () { printCard(label || "Scan me", "", url); };
    row.appendChild(dl);
    row.appendChild(pr);
    slot.appendChild(row);
  }

  window.kosQR = {
    paint: paint,
    draw: draw,
    downloadPNG: downloadPNG,
    printCard: printCard,
    colors: COLORS,
    fallbackText: FALLBACK
  };
})();
