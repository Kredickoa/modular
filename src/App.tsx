import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import gsap from 'gsap';
import ScrollReveal from './components/ScrollReveal';
import GoogleModelViewer from './components/GoogleModelViewer';

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function NavItem({ text }: { text: string }) {
  const [cycle, setCycle] = useState(0);
  const destination = text === 'THE HOME' ? 'house' : ['ABOUT', 'MATERIALS', 'LIVING'].includes(text) ? 'about' : null;

  return (
    <button
      type="button" aria-haspopup={destination ? undefined : 'dialog'} onClick={() => destination ? document.getElementById(destination)?.scrollIntoView({ behavior: 'smooth' }) : document.querySelector<HTMLDialogElement>('#demo-info')?.showModal()}
      className="relative overflow-hidden group flex items-center justify-center py-1"
      onMouseEnter={() => setCycle(c => c + 1)}
      onMouseLeave={() => setCycle(c => c + 1)}
    >
      {cycle === 0 ? (
        <span className="block text-white/64 group-hover:text-white transition-colors duration-300">
          {text}
        </span>
      ) : (
        <React.Fragment key={cycle}>
          <span className="block text-white/64 group-hover:text-white transition-colors duration-300 animate-fly-out-up">
            {text}
          </span>
          <span className="absolute block text-white/64 group-hover:text-white transition-colors duration-300 animate-fly-in-up">
            {text}
          </span>
        </React.Fragment>
      )}
    </button>
  );
}

const TOTAL_FRAMES = 192;
const ZOOM_FACTOR = 1;

export default function App() {
  const [arrowCycle, setArrowCycle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedProgress, setLoadedProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);

  const screen3Ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const { scrollYProgress: screen3Progress } = useScroll({
    target: screen3Ref,
    offset: ["start end", "start start"]
  });

  // Header animation: start moving up after screen 1
  const headerY = useTransform(scrollY, [0, 500, 800], [0, 0, -150]);

  // Finish flattening when it's 80% of the way to the top
  const rotateX = useTransform(screen3Progress, [0, 0.8], [15, 0]);
  const y = useTransform(screen3Progress, [0, 0.8], [100, 0]);

  useEffect(() => {
    let loadedCount = 0;
    let usableCount = 0;
    let cancelled = false;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNumber = i.toString().padStart(3, '0');

      const handleLoad = () => {
        if (cancelled) return;
        loadedCount++;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) usableCount++;
        setLoadedProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) {
          imagesRef.current = images;
          if (usableCount) setIsLoaded(true);
          else setLoadError(true);
        }
      };

      img.onload = handleLoad;
      img.onerror = handleLoad;
      images.push(img);
      img.src = `./frames/house-${frameNumber}.webp`;
    }
    return () => {
      cancelled = true;
      images.forEach(image => { image.onload = null; image.onerror = null; });
    };
  }, []);

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const images = imagesRef.current;

    if (!canvas || !ctx || !images[index]) return;

    const requested = images[index];
    const img = requested.complete && requested.naturalWidth > 0 ? requested : images.find(image => image.complete && image.naturalWidth > 0);
    if (!img) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(window.innerWidth * pixelRatio);
    const height = Math.round(window.innerHeight * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawHeight = canvas.width / imgRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawWidth = canvas.height * imgRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    const zoomedWidth = drawWidth * ZOOM_FACTOR;
    const zoomedHeight = drawHeight * ZOOM_FACTOR;
    const zoomOffsetX = offsetX - (zoomedWidth - drawWidth) / 2;
    const zoomOffsetY = offsetY - (zoomedHeight - drawHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, zoomOffsetX, zoomOffsetY, zoomedWidth, zoomedHeight);
  };

  useEffect(() => {
    if (!isLoaded) return;

    drawFrame(0);

    const handleScroll = () => {
      if (!screen3Ref.current) return;

      const rect = screen3Ref.current.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const stopScroll = Math.max(1, absoluteTop - (window.innerHeight * 0.2));

      const scrollFraction = Math.max(0, Math.min(1, window.scrollY / stopScroll));

      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(scrollFraction * TOTAL_FRAMES)
      );

      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(() => drawFrame(frameIndex));
      }
    };

    const handleResize = () => {
      drawFrame(currentFrameRef.current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20; // -10 to 10
      const y = (e.clientY / window.innerHeight - 0.5) * 20; // -10 to 10

      gsap.to(canvas, {
        x: -x,
        y: -y,
        duration: 0.5,
        ease: "power2.out"
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isLoaded]);

  return (
    <>

      {!isLoaded && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white font-sans z-50">
          <div role={loadError ? 'alert' : 'status'} className="text-[10px] font-mono tracking-widest mb-4 text-white/50">{loadError ? 'SEQUENCE UNAVAILABLE' : 'LOADING SEQUENCE'}</div>
          <div className="text-4xl font-mono">{loadError ? <button type="button" onClick={() => location.reload()} className="text-sm underline underline-offset-4">RETRY</button> : `${loadedProgress}%`}</div>
          <div className="w-64 h-[1px] bg-white/10 mt-8 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${loadedProgress}%` }}
            />
          </div>
        </div>
      )}

      <div id="top" className="relative w-full bg-black text-white font-sans">

        <div className="fixed top-0 left-0 w-full h-screen z-0 overflow-hidden bg-black">
          <canvas
            ref={canvasRef}
            className="w-full h-full will-change-transform"
            style={{ scale: 1.05 }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60 pointer-events-none" />
        </div>

      <motion.header
        style={{ y: headerY }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-20 w-[90%] flex items-center justify-between pointer-events-auto py-4 md:py-6 lg:py-8"
      >

          <div className="flex items-center">
            <span className="font-sans text-[24px] font-medium tracking-[0.18em] text-white" aria-label="Modular">MODULAR</span>
          </div>

          <nav className="hidden lg:flex items-stretch bg-[#1A1A1A]/40 backdrop-blur-[80px]">
            <div className="flex items-center justify-between px-6 font-mono text-xs tracking-[-0.01em] w-[480px]">
              <NavItem text="ABOUT" />
              <NavItem text="THE HOME" />
              <NavItem text="MATERIALS" />
              <NavItem text="LIVING" />
              <NavItem text="CONTACT" />
            </div>
            <button type="button" onClick={() => document.querySelector<HTMLDialogElement>('#demo-info')?.showModal()} className="bg-white text-black px-6 py-5 font-mono text-xs leading-4 font-bold tracking-[-0.01em] hover:bg-gray-200 transition-colors w-[148px]">
              GET IN TOUCH
            </button>
          </nav>
        </motion.header>

      <div className="relative z-10 w-full pointer-events-none">

        <div className="w-[90%] mx-auto h-screen flex flex-col py-8 md:py-12 lg:py-16 pb-12">
          <main className="flex-1 w-full pointer-events-auto flex flex-col md:grid md:grid-cols-12 md:grid-rows-[1fr_auto] gap-y-8 md:gap-y-0 md:gap-x-8">

          <div className="md:row-start-2 md:col-start-1 md:col-span-8 flex items-end">
            <Reveal delay={0.2}>
              <h1 className="text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] font-medium tracking-tight text-white whitespace-nowrap">
                Space to live.<br />
                Room to breathe.
              </h1>
            </Reveal>
          </div>

          <div className="md:row-start-1 md:col-start-8 md:col-span-5 flex flex-col justify-center items-start md:items-end text-left md:text-right">
            <Reveal delay={0.3}>
              <p className="text-[clamp(1rem,1.6vw,1.375rem)] text-white/64 leading-[1.3] font-normal max-w-[460px]">
                Modular homes shaped around natural materials, open views and everyday comfort. <span className="font-semibold text-white">Designed for a slower rhythm.</span>
              </p>
            </Reveal>
          </div>

          <div className="md:row-start-2 md:col-start-8 md:col-span-5 flex items-end justify-start md:justify-end">
            <Reveal delay={0.4}>
              <button
                type="button"
                onClick={() => document.getElementById('house')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-stretch gap-1 group cursor-pointer"
                onMouseEnter={() => setArrowCycle(c => c + 1)}
                onMouseLeave={() => setArrowCycle(c => c + 1)}
              >

                <div className="flex items-center px-8 py-5 bg-white/8 backdrop-blur-[80px] group-hover:bg-white transition-colors duration-300">
                  <span className="font-mono text-[12px] tracking-[-0.01em] text-white/90 group-hover:text-black transition-colors duration-300">
                    EXPLORE THE HOME
                  </span>
                </div>

                <div className="relative flex items-center justify-center px-6 bg-white/8 backdrop-blur-[80px] group-hover:bg-white transition-colors duration-300 overflow-hidden">
                  {arrowCycle === 0 ? (
                    <ArrowRight className="w-5 h-5 text-white/90 group-hover:text-black transition-colors duration-300" />
                  ) : (
                    <React.Fragment key={arrowCycle}>
                      <ArrowRight className="w-5 h-5 text-white/90 group-hover:text-black transition-colors duration-300 animate-fly-out" />
                      <ArrowRight className="absolute w-5 h-5 text-white/90 group-hover:text-black transition-colors duration-300 animate-fly-in" />
                    </React.Fragment>
                  )}
                </div>
              </button>
            </Reveal>
          </div>

          </main>
        </div>

        <div className="h-[200px] w-full"></div>

        <div className="w-[90%] mx-auto min-h-screen flex flex-col justify-center py-8 md:py-12 lg:py-16 pointer-events-auto">
          <div className="max-w-[1200px] w-full" id="about">
            <ScrollReveal
              baseOpacity={0.1}
              enableBlur={true}
              baseRotation={3}
              blurStrength={4}
              textClassName="text-[clamp(2rem,4.5vw,4rem)] leading-[1.1] font-medium tracking-tight text-white w-full"
            >
              A simpler way to feel at home. Thoughtful spaces, natural materials and a panoramic connection to the outdoors. Architecture that makes room for life.
            </ScrollReveal>

            <div className="mt-24 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

              <Reveal delay={0.1} className="md:col-span-4 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <svg width="71" height="43" viewBox="0 0 71 43" fill="none" aria-hidden="true"><path d="M5 36V13L50 6L66 14V36H5ZM5 13L50 18L66 14M50 18V36M13 36V20H24V36M29 36V22H42V36" stroke="white" strokeWidth="1"/></svg>
                  <span className="font-sans text-[24px] font-medium tracking-[0.18em] text-white" aria-label="Modular">MODULAR</span>
                </div>
                <p className="text-[11px] font-mono tracking-widest text-white/60 uppercase leading-relaxed">
                  Room to live<br/>closer to nature
                </p>
              </Reveal>

              <Reveal delay={0.2} className="md:col-span-4 flex flex-col gap-4">
                <h3 className="text-xl font-medium text-white">Built around<br/>the way you live</h3>
                <p className="text-[15px] text-white/80 leading-relaxed">
                  An open living space, full-height glazing and a generous terrace connect everyday life with the landscape beyond.
                </p>
              </Reveal>

              <Reveal delay={0.3} className="md:col-span-4 flex flex-col gap-4">
                <h3 className="text-xl font-medium text-white">Natural materials.<br/>Quiet character.</h3>
                <p className="text-[15px] text-white/80 leading-relaxed">
                  Dark timber, warm interior finishes and carefully balanced proportions give this compact home a calm, considered character.
                </p>
              </Reveal>
            </div>
          </div>
        </div>

        <div className="h-[200px] w-full"></div>

        <div ref={screen3Ref} className="w-full h-[300vh] pointer-events-auto relative" id="house">
          <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden" style={{ perspective: '1200px' }}>
            <motion.div
              style={{ rotateX, y, transformOrigin: "bottom center" }}
              className="w-[80vw] h-[80vh] bg-[#1A1A1A]/40 backdrop-blur-[80px] border border-white/10 flex flex-col items-center justify-center p-8 relative"
            >

              <div className="absolute top-8 left-8 z-10 pointer-events-none flex flex-col gap-2">
                <h3 className="text-[18px] font-sans font-medium text-white uppercase tracking-wide">
                  MODULAR / 01
                </h3>
                <p className="text-[12px] font-sans text-white/64 max-w-[300px]">
                  A compact home. An open way of living.
                </p>
              </div>

              <div className="absolute top-8 right-8 z-10 pointer-events-none">
                <table className="font-mono text-[10px] text-white/80 border-separate border-spacing-x-4 border-spacing-y-1">
                  <tbody>
                    <tr>
                      <td className="text-right text-white/50">FLOOR AREA:</td>
                      <td className="text-left font-medium text-white">48 M²</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">WIDTH:</td>
                      <td className="text-left font-medium text-white">10 M</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">DEPTH:</td>
                      <td className="text-left font-medium text-white">4.8 M</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">ROOF:</td>
                      <td className="text-left font-medium text-white">FLAT</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">EXTERIOR:</td>
                      <td className="text-left font-medium text-white">DARK TIMBER</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">FRONT:</td>
                      <td className="text-left font-medium text-white">PANORAMIC GLASS</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">STATUS:</td>
                      <td className="text-left font-medium text-white">DESIGN CONCEPT</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="w-full h-full flex items-center justify-center">
                <GoogleModelViewer
                  src="./models/modular-home.glb"
                  autoRotate={true}
                  cameraControls={true}
                  shadowIntensity={0.5}
                  exposure={1}
                />
              </div>
            </motion.div>
          </div>
        </div>

      </div>

      <dialog id="demo-info" aria-labelledby="demo-info-title" className="max-w-md rounded-2xl border border-white/20 bg-neutral-950 p-8 text-stone-100 shadow-2xl backdrop:bg-black/60">
        <h2 id="demo-info-title" className="text-xl font-medium mb-4">Portfolio concept</h2>
        <p className="text-sm leading-relaxed text-stone-300">This home is a portfolio design concept. Contact details will be added before publication.</p>
        <form method="dialog" className="mt-6">
          <button className="rounded-full bg-white px-5 py-2 text-sm text-black">Close</button>
        </form>
      </dialog>
</div>
    </>
  );
}
