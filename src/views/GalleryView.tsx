import { FoundationsSection } from '../ui/gallery/FoundationsSection';
import { OverlaysSection } from '../ui/gallery/OverlaysSection';

export function GalleryView() {
  return (
    <div className="settings-wrap" data-testid="gallery-view">
      <div className="settings-page">
        <header className="settings-header">
          <span className="eyebrow">UI kit</span>
          <h1>Gallery</h1>
          <p>Every kit component in the states the approved design defines.</p>
        </header>
        <FoundationsSection />
        <OverlaysSection />
      </div>
    </div>
  );
}
