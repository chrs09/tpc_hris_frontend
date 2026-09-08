import usePWAInstall from "../hooks/usePWAInstall";

const PWAInstallButton = () => {
  const { installApp, canInstall } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={installApp}
      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
    >
      Install App
    </button>
  );
};

export default PWAInstallButton;
