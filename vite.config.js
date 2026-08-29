import { defineConfig } from 'vite';

export default defineConfig({
    base: '/weaveIODTCentral/',
    server: {
        watch: {
            usePolling: true
        }
    }
});
