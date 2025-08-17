export function setupInstallPrompt() {
  let deferred: any;
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferred = e as any;
    // In a real app expose UI to trigger: deferred.prompt()
  });
}
