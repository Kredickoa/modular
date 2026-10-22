import React from 'react';

interface GoogleModelViewerProps {
  src: string;
  poster?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
  shadowIntensity?: number;
  environmentImage?: string;
  exposure?: number;
  cameraOrbit?: string;
  className?: string;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.HTMLAttributes<HTMLElement> & {
        src: string;
        poster?: string;
        'auto-rotate'?: '';
        'camera-controls'?: '';
        'shadow-intensity'?: number;
        'environment-image'?: string;
        exposure?: number;
        'camera-orbit'?: string;
        'interaction-prompt'?: string;
        'ar-status'?: string;
        loading?: 'eager' | 'lazy';
      };
    }
  }
}

const GoogleModelViewer: React.FC<GoogleModelViewerProps> = ({
  src,
  poster,
  autoRotate = true,
  cameraControls = true,
  shadowIntensity = 1,
  environmentImage = 'neutral',
  exposure = 1,
  cameraOrbit = '30deg 75deg 110%',
  className = "w-full h-full"
}) => {
  return (
    <div className={className}>
      <model-viewer
        src={src}
        poster={poster}
        auto-rotate={autoRotate ? "" : undefined}
        camera-controls={cameraControls ? "" : undefined}
        shadow-intensity={shadowIntensity}
        environment-image={environmentImage}
        exposure={exposure}
        camera-orbit={cameraOrbit}
        interaction-prompt="none"
        ar-status="not-presenting"
        loading="eager"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent', '--poster-color': 'transparent' } as React.CSSProperties}
      >
      </model-viewer>
    </div>
  );
};

export default GoogleModelViewer;
