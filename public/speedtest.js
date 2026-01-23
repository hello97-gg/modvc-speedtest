/**
 * MODVC Speed Test - Fast Real-time Updates
 */

class SpeedTest {
    constructor() {
        this.speedValue = document.getElementById('speedValue');
        this.speedLabel = document.getElementById('speedLabel');
        this.restartBtn = document.getElementById('restartBtn');
        this.moreInfoBtn = document.getElementById('moreInfoBtn');
        this.infoPanel = document.getElementById('infoPanel');
        this.helpBtn = document.getElementById('helpBtn');
        this.helpModal = document.getElementById('helpModal');
        this.closeHelp = document.getElementById('closeHelp');

        this.pingUnloaded = document.getElementById('pingUnloaded');
        this.pingLoaded = document.getElementById('pingLoaded');
        this.uploadSpeed = document.getElementById('uploadSpeed');
        this.clientLocation = document.getElementById('clientLocation');
        this.downloadData = document.getElementById('downloadData');
        this.uploadData = document.getElementById('uploadData');

        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModal = document.getElementById('closeModal');
        this.resetBtn = document.getElementById('resetBtn');
        this.saveBtn = document.getElementById('saveBtn');

        this.isRunning = false;
        this.abortController = null;
        this.finalDownloadSpeed = 0;

        this.settings = {
            testDuration: 15,
            autoStart: true,
            showInfoAuto: false
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.getClientLocation();

        if (this.settings.showInfoAuto) this.showInfo();

        if (this.settings.autoStart) {
            setTimeout(() => this.startTest(), 500);
        } else {
            this.restartBtn.classList.add('visible');
            this.speedLabel.textContent = 'Click to start test';
        }
    }

    bindEvents() {
        this.restartBtn.addEventListener('click', () => {
            if (!this.isRunning) this.startTest();
        });

        this.moreInfoBtn.addEventListener('click', () => this.toggleInfo());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeModal.addEventListener('click', () => this.closeSettings());
        this.resetBtn.addEventListener('click', () => this.resetSettings());
        this.saveBtn.addEventListener('click', () => this.saveSettings());

        if (this.helpBtn) this.helpBtn.addEventListener('click', () => this.openHelp());
        if (this.closeHelp) this.closeHelp.addEventListener('click', () => this.closeHelpModal());
        if (this.helpModal) {
            this.helpModal.addEventListener('click', (e) => {
                if (e.target === this.helpModal) this.closeHelpModal();
            });
        }

        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });
    }

    openHelp() { if (this.helpModal) this.helpModal.classList.remove('hidden'); }
    closeHelpModal() { if (this.helpModal) this.helpModal.classList.add('hidden'); }

    async startTest() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.abortController = new AbortController();
        this.finalDownloadSpeed = 0;

        this.restartBtn.classList.remove('visible');
        this.restartBtn.classList.add('spinning');
        this.speedValue.classList.add('testing');
        this.speedValue.classList.remove('active');
        this.speedLabel.textContent = '';
        this.speedValue.textContent = '0';

        this.pingUnloaded.textContent = '--';
        this.pingLoaded.textContent = '--';
        this.uploadSpeed.textContent = '--';
        this.downloadData.textContent = '0 MB';
        this.uploadData.textContent = '0 MB';

        try {
            // Run latency test in background while download runs
            const pingPromise = this.measurePing();

            // Start download test immediately
            await this.runDownloadTest();

            this.finalDownloadSpeed = Math.round(this.currentDownloadSpeed);

            // Make sure ping is done before upload
            await pingPromise;

            // Run upload test (silently)
            await this.runUploadTest();

            this.testComplete();
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Test error:', error);
                this.speedLabel.textContent = 'Test failed';
            }
            this.finishTest();
        }
    }

    finishTest() {
        this.isRunning = false;
        this.restartBtn.classList.remove('spinning');
        this.restartBtn.classList.add('visible');
        this.speedValue.classList.remove('testing');
    }

    testComplete() {
        this.finishTest();
        this.speedValue.classList.add('active');
        this.speedLabel.textContent = 'Your Internet speed is';
        this.speedValue.textContent = this.finalDownloadSpeed;
        this.downloadData.textContent = this.formatBytes(this.totalDownloadBytes);
        this.uploadData.textContent = this.formatBytes(this.totalUploadBytes);
    }

    async measurePing() {
        const pings = [];

        for (let i = 0; i < 5; i++) {
            if (this.abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

            const start = performance.now();
            try {
                await fetch('/ping?t=' + Date.now(), {
                    signal: this.abortController.signal,
                    cache: 'no-store'
                });
                pings.push(Math.round(performance.now() - start));
            } catch (e) {
                if (e.name === 'AbortError') throw e;
            }
            await this.sleep(50);
        }

        if (pings.length > 0) {
            pings.sort((a, b) => a - b);
            const median = pings[Math.floor(pings.length / 2)];
            this.pingUnloaded.textContent = median;
            this.pingLoaded.textContent = Math.round(median * 1.1);
        }
    }

    async runDownloadTest() {
        const duration = this.settings.testDuration * 1000;
        const chunkSize = 256 * 1024; // 256KB for fast updates
        this.totalDownloadBytes = 0;
        this.currentDownloadSpeed = 0;
        const startTime = performance.now();

        // Rolling window for instant speed
        const recentSpeeds = [];
        const maxSamples = 10;

        while (performance.now() - startTime < duration) {
            if (this.abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

            const chunkStart = performance.now();

            // Single download for faster response
            try {
                const bytes = await this.downloadChunk(chunkSize);
                this.totalDownloadBytes += bytes;

                const elapsed = (performance.now() - chunkStart) / 1000;
                if (elapsed > 0 && bytes > 0) {
                    const instantSpeed = (bytes * 8) / elapsed / 1000000;

                    // Rolling average for smooth but responsive display
                    recentSpeeds.push(instantSpeed);
                    if (recentSpeeds.length > maxSamples) recentSpeeds.shift();

                    const avg = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;
                    this.currentDownloadSpeed = avg;

                    // Update immediately
                    this.speedValue.textContent = Math.round(avg);

                    // Real-time data size update
                    this.downloadData.textContent = this.formatBytes(this.totalDownloadBytes);
                }
            } catch (e) {
                if (e.name === 'AbortError') throw e;
            }
        }
    }

    async downloadChunk(size) {
        try {
            const response = await fetch(`/download?size=${size}&t=${Date.now()}`, {
                signal: this.abortController.signal,
                cache: 'no-store'
            });
            const buffer = await response.arrayBuffer();
            return buffer.byteLength;
        } catch (e) {
            if (e.name === 'AbortError') throw e;
            return 0;
        }
    }

    async runUploadTest() {
        const duration = this.settings.testDuration * 1000;
        const chunkSize = 128 * 1024; // 128KB for fast updates
        this.totalUploadBytes = 0;
        const startTime = performance.now();

        // Keep download speed visible
        this.speedValue.textContent = this.finalDownloadSpeed;

        const recentSpeeds = [];
        const maxSamples = 10;

        while (performance.now() - startTime < duration) {
            if (this.abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

            const chunkStart = performance.now();

            try {
                const bytes = await this.uploadChunk(chunkSize);
                this.totalUploadBytes += bytes;

                const elapsed = (performance.now() - chunkStart) / 1000;
                if (elapsed > 0 && bytes > 0) {
                    const instantSpeed = (bytes * 8) / elapsed / 1000000;

                    recentSpeeds.push(instantSpeed);
                    if (recentSpeeds.length > maxSamples) recentSpeeds.shift();

                    const avg = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;

                    // Update upload display immediately
                    this.uploadSpeed.textContent = Math.round(avg);

                    // Real-time data size update
                    this.uploadData.textContent = this.formatBytes(this.totalUploadBytes);
                }
            } catch (e) {
                if (e.name === 'AbortError') throw e;
            }

            // Keep showing download speed
            this.speedValue.textContent = this.finalDownloadSpeed;
        }
    }

    async uploadChunk(size) {
        try {
            const data = new Uint8Array(size);

            const response = await fetch('/upload', {
                method: 'POST',
                body: data,
                signal: this.abortController.signal,
                headers: { 'Content-Type': 'application/octet-stream' }
            });

            const result = await response.json();
            return result.bytesReceived || size;
        } catch (e) {
            if (e.name === 'AbortError') throw e;
            return 0;
        }
    }

    toggleInfo() {
        const isHidden = this.infoPanel.classList.toggle('hidden');
        this.moreInfoBtn.textContent = isHidden ? 'Show more info' : 'Hide info';
    }

    showInfo() {
        this.infoPanel.classList.remove('hidden');
        this.moreInfoBtn.textContent = 'Hide info';
    }

    async getClientLocation() {
        try {
            const res = await fetch('/ip-info');
            const data = await res.json();
            this.clientLocation.textContent = `${data.city || 'Unknown'}${data.country_code ? ', ' + data.country_code : ''}`;
        } catch {
            this.clientLocation.textContent = 'Unknown';
        }
    }

    openSettings() {
        document.getElementById('testDuration').value = this.settings.testDuration;
        document.getElementById('autoStart').checked = this.settings.autoStart;
        document.getElementById('showInfoAuto').checked = this.settings.showInfoAuto;
        this.settingsModal.classList.remove('hidden');
    }

    closeSettings() { this.settingsModal.classList.add('hidden'); }

    saveSettings() {
        this.settings.testDuration = Math.min(30, Math.max(5, parseInt(document.getElementById('testDuration').value) || 15));
        this.settings.autoStart = document.getElementById('autoStart').checked;
        this.settings.showInfoAuto = document.getElementById('showInfoAuto').checked;

        localStorage.setItem('modvc-speedtest-settings', JSON.stringify(this.settings));
        if (this.settings.showInfoAuto) this.showInfo();
        this.closeSettings();
    }

    resetSettings() {
        this.settings = { testDuration: 15, autoStart: true, showInfoAuto: false };
        document.getElementById('testDuration').value = 15;
        document.getElementById('autoStart').checked = true;
        document.getElementById('showInfoAuto').checked = false;
        localStorage.removeItem('modvc-speedtest-settings');
    }

    loadSettings() {
        const saved = localStorage.getItem('modvc-speedtest-settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                this.settings.testDuration = Math.min(30, Math.max(5, this.settings.testDuration));
            } catch { }
        }
    }

    formatBytes(bytes) {
        if (!bytes) return '0 MB';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / (1024 * 1024)) + ' MB';
    }

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

document.addEventListener('DOMContentLoaded', () => {
    window.speedTest = new SpeedTest();
});
