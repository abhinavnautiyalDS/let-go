export default function SceneBackground() {
  const assetBase = "/assets/scene-01";

  const layers = [
    "BACKGROUND.png",
    "WINDOW.png",
    "TABLE.png",
    "CUP.png",
    "LAMP.png",
  ];

  return (
    <div className="scene-background-container" aria-hidden="true">
      <div className="scene-camera">
        {layers.map((layer) => (
          <img
            key={layer}
            className="layer"
            src={`${assetBase}/${layer}`}
            alt=""
            draggable={false}
          />
        ))}
        <div className="lamp-glow" />
        <div className="rain" />
        <div className="film-grain" />
      </div>
    </div>
  );
}
