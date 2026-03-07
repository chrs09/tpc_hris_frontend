import usePWAInstall from "../hooks/usePWAInstall";

const PWAInstallButton = () => {
  const { installApp, canInstall } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={installApp}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
    >
      Install App
    </button>
  );
};

export default PWAInstallButton;