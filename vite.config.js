import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'event-signup': resolve(__dirname, 'event-signup.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        go: resolve(__dirname, 'go.html'),
        join: resolve(__dirname, 'join.html'),
        'krewe-history': resolve(__dirname, 'krewe-history.html'),
        learn: resolve(__dirname, 'learn.html'),
        members: resolve(__dirname, 'members.html'),
        'membership-application': resolve(__dirname, 'membership-application.html'),
        parades: resolve(__dirname, 'parades.html'),
        'photo-image-release': resolve(__dirname, 'photo-image-release.html'),
        poetry: resolve(__dirname, 'poetry.html'),
        'raffle-demo': resolve(__dirname, 'raffle-demo.html'),
        'raffle-qr-sheet': resolve(__dirname, 'raffle-qr-sheet.html'),
        raffle: resolve(__dirname, 'raffle.html'),
        share: resolve(__dirname, 'share.html'),
        store: resolve(__dirname, 'store.html'),
        'tartan-ball-labels': resolve(__dirname, 'tartan-ball-labels.html'),
        'tartan-ball-sponsors': resolve(__dirname, 'tartan-ball-sponsors.html'),
        'tartan-ball': resolve(__dirname, 'tartan-ball.html'),
        videos: resolve(__dirname, 'videos.html'),
        volunteer: resolve(__dirname, 'volunteer.html'),
      },
    },
  },
});
