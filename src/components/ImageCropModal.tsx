import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Maximize2, 
  RotateCw, 
  Layers, 
  ArrowRight, 
  Check, 
  Compass, 
  Shirt, 
  Grid3X3, 
  Sparkles, 
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Move
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirmCrop: (croppedBase64: string) => void;
  isUploading: boolean;
}

// Available mockup templates for realistic high-end streetwear previewing
interface MockupTemplate {
  id: string;
  name: string;
  type: 'shirt' | 'hoodie' | 'none';
  color: string;
  fillColor: string;
  label: string;
}

const MOCKUP_TEMPLATES: MockupTemplate[] = [
  { id: 'tee-black', name: 'Oversized Boxy Tee (Noir Black)', type: 'shirt', color: 'Black', fillColor: '#121212', label: 'Noir Tee' },
  { id: 'tee-white', name: 'Oversized Boxy Tee (Oat Cream)', type: 'shirt', color: 'White', fillColor: '#F2ECE1', label: 'Oat Tee' },
  { id: 'tee-teal', name: 'Oversized Boxy Tee (Vintage Teal)', type: 'shirt', color: 'Teal', fillColor: '#2C5E64', label: 'Teal Tee' },
  { id: 'hoodie-charcoal', name: 'Heavyweight Hoodie (Acid Charcoal)', type: 'hoodie', color: '#3A3A3C', fillColor: '#2C2C2E', label: 'Acid Hoodie' },
  { id: 'hoodie-black', name: 'Heavyweight Hoodie (Noir Black)', type: 'hoodie', color: '#161617', fillColor: '#121212', label: 'Noir Hoodie' },
  { id: 'raw-crop', name: 'Graphic Crop Only (Transparent/Flat)', type: 'none', color: 'Transparent', fillColor: 'transparent', label: 'Flat Crop' }
];

export function ImageCropModal({ isOpen, onClose, file, onConfirmCrop, isUploading }: ImageCropModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Trim, Step 2: Assemble
  const [originalSrc, setOriginalSrc] = useState<string>('');
  
  // Crop settings (percentages or ratios relative to original image size)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  
  // Mockup Alignment Workspace
  const [selectedMockup, setSelectedMockup] = useState<MockupTemplate>(MOCKUP_TEMPLATES[0]);
  const [designPlacement, setDesignPlacement] = useState({
    scale: 40,      // percentage of the print area
    xOffset: 0,     // adjustment from center
    yOffset: -10,   // adjustment from center
    rotation: 0     // degrees rotation
  });

  const [croppedGraphic, setCroppedGraphic] = useState<string>(''); // Result of step 1

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load selected file as dataURL
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalSrc(reader.result as string);
      setStep(1); // Reset back to step 1
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    };
    reader.readAsDataURL(file);
  }, [file]);

  // Handle Dragging / Resizing the Crop Box Bounding Rect
  const handleMouseDown = (handle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveHandle(handle);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeHandle || !containerRef.current || !imageRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const imgWidth = imageRef.current.clientWidth;
      const imgHeight = imageRef.current.clientHeight;

      // Calculate cursor position inside the image container in percentages
      const xPercent = ((e.clientX - rect.left) / imgWidth) * 100;
      const yPercent = ((e.clientY - rect.top) / imgHeight) * 100;

      setCropBox(prev => {
        let { x, y, width, height } = prev;

        const minSize = 10; // minimum 10%

        if (activeHandle === 'center') {
          // Move the entire box, need offsets. For simplicity, match center to cursor
          const nextX = Math.max(0, Math.min(100 - width, xPercent - width / 2));
          const nextY = Math.max(0, Math.min(100 - height, yPercent - height / 2));
          return { ...prev, x: nextX, y: nextY };
        }

        if (activeHandle.includes('n')) {
          const nextY = Math.max(0, Math.min(y + height - minSize, yPercent));
          height = height + (y - nextY);
          y = nextY;
        }
        if (activeHandle.includes('s')) {
          height = Math.max(minSize, Math.min(100 - y, yPercent - y));
        }
        if (activeHandle.includes('w')) {
          const nextX = Math.max(0, Math.min(x + width - minSize, xPercent));
          width = width + (x - nextX);
          x = nextX;
        }
        if (activeHandle.includes('e')) {
          width = Math.max(minSize, Math.min(100 - x, xPercent - x));
        }

        return { x, y, width, height };
      });
    };

    const handleMouseUp = () => {
      setActiveHandle(null);
    };

    if (activeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle]);

  // Execute Step 1: Perform the trim / crop on the image file and set croppedGraphic state
  const handleProceedToMockup = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Source coordinates calculated from percentages
    const sourceX = (cropBox.x / 100) * img.naturalWidth;
    const sourceY = (cropBox.y / 100) * img.naturalHeight;
    const sourceWidth = (cropBox.width / 100) * img.naturalWidth;
    const sourceHeight = (cropBox.height / 100) * img.naturalHeight;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    const croppedBase64 = canvas.toDataURL('image/png');
    setCroppedGraphic(croppedBase64);
    setStep(2);
  };

  // Build the final high-definition image with design printed perfectly on apparel template
  const handleFinalizeAndForge = async () => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) {
      // Fallback
      onConfirmCrop(croppedGraphic);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1000;

    // 1. Draw Mockup background
    ctx.fillStyle = '#0F0F0F';
    ctx.fillRect(0, 0, 800, 1000);

    // If "none" means user only wants flat cropped icon, we skip template rendering
    if (selectedMockup.type !== 'none') {
      try {
        const mockupSvg = getMockupSvgPath(selectedMockup);
        const mockupImg = await loadImgAsync(mockupSvg);
        ctx.drawImage(mockupImg, 0, 0, 800, 1000);
      } catch (err) {
        console.error('Failed to render vector garment background:', err);
      }
    } else {
      // Direct raw transparent background mode
      ctx.clearRect(0, 0, 800, 1000);
      ctx.fillStyle = '#0A0A0B';
      ctx.fillRect(0, 0, 800, 1000);
    }

    // 2. Composite User Crop Design on top with the appropriate placement parameters
    try {
      const designImg = await loadImgAsync(croppedGraphic);

      // Save context state in order to apply translates & rotates safely
      ctx.save();

      // Find the print chest window area configuration
      // Standard sweet post is centered horizontally (400), and shifted vertically based on T-shirt/hoodie neck
      const centerX = 400 + (designPlacement.xOffset * 4); // Scale values for relative canvas sizing
      const centerY = (selectedMockup.type === 'hoodie' ? 480 : 420) + (designPlacement.yOffset * 4);

      ctx.translate(centerX, centerY);
      ctx.rotate((designPlacement.rotation * Math.PI) / 180);

      // Base design width relative to garment chest (about 300px max, then governed by scale slider)
      const baseWidth = 280;
      const aspect = designImg.naturalHeight / designImg.naturalWidth;
      const finalWidth = baseWidth * (designPlacement.scale / 100);
      const finalHeight = finalWidth * aspect;

      // Draw centered
      ctx.drawImage(
        designImg,
        -finalWidth / 2,
        -finalHeight / 2,
        finalWidth,
        finalHeight
      );

      ctx.restore();
    } catch (err) {
      console.error('Failed drawing crop pattern on mockup background:', err);
    }

    const finalResultBase64 = canvas.toDataURL('image/jpeg', 0.85);
    onConfirmCrop(finalResultBase64);
  };

  const loadImgAsync = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  };

  // Dynamic vector paths for streetwear garments so they build fully client side
  const getMockupSvgPath = (mockup: MockupTemplate): string => {
    let svgContent = '';

    if (mockup.type === 'shirt') {
      svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
          <defs>
            <filter id="shadow" x="-5%" y="-5%" width="120%" height="120%">
              <feDropShadow dx="0" dy="12" stdDeviation="15" flood-opacity="0.8" flood-color="#000000" />
            </filter>
          </defs>
          <g filter="url(#shadow)">
            <!-- Front Streetwear Boxy T-Shirt Shell -->
            <path d="M 170,140 L 260,110 C280,105 320,135 340,140 C360,145 440,145 460,140 C480,135 520,105 540,110 L 630,140 C655,148 665,170 660,190 L 620,310 C615,325 600,335 585,330 L 545,315 L 555,880 C555,895 540,910 525,910 L 275,910 C260,910 245,895 245,880 L 255,315 L 215,330 C200,335 185,325 180,310 L 140,190 C135,170 145,148 170,140 Z" fill="${mockup.fillColor}" stroke="${mockup.fillColor === '#121212' ? '#252525' : '#D1CAC2'}" stroke-width="2" />
            
            <!-- Sleve Hem fold lines -->
            <path d="M 180,310 L 215,300" stroke="${mockup.fillColor === '#121212' ? '#1F1F1F' : '#C4BDB5'}" stroke-width="3" />
            <path d="M 620,310 L 585,300" stroke="${mockup.fillColor === '#121212' ? '#1F1F1F' : '#C4BDB5'}" stroke-width="3" />
            
            <!-- Ribbed Collar Rim detail -->
            <path d="M 340,140 C350,165 450,165 460,140 C460,132 340,132 340,140 Z" fill="${mockup.fillColor === '#121212' ? '#0F0F0F' : '#DDD6CD'}" stroke="${mockup.fillColor === '#121212' ? '#202020' : '#C1BAB1'}" stroke-width="2" />
            <path d="M 350,150 C350,158 450,158 450,150" fill="none" stroke="${mockup.fillColor === '#121212' ? '#222' : '#C7C0B7'}" stroke-width="1.5" />
            
            <!-- Photorealistic heavy cotton folds and shades -->
            <path d="M 270,180 Q 295,215 320,200" fill="none" stroke="${mockup.fillColor === '#121212' ? '#0F0F0F' : '#E5DFD6'}" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
            <path d="M 530,180 Q 505,215 480,200" fill="none" stroke="${mockup.fillColor === '#121212' ? '#0F0F0F' : '#E5DFD6'}" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
            <path d="M 260,390 Q 305,420 335,405" fill="none" stroke="${mockup.fillColor === '#121212' ? '#0A0A0A' : '#EAE4DB'}" stroke-width="3.5" stroke-linecap="round" opacity="0.3"/>
            <path d="M 540,390 Q 495,420 465,405" fill="none" stroke="${mockup.fillColor === '#121212' ? '#0A0A0A' : '#EAE4DB'}" stroke-width="3.5" stroke-linecap="round" opacity="0.3"/>
            <path d="M 255,640 Q 290,660 315,650" fill="none" stroke="${mockup.fillColor === '#121212' ? '#080808' : '#FAF4EB'}" stroke-width="2.5" stroke-linecap="round" opacity="0.25"/>
            <path d="M 545,640 Q 510,660 485,650" fill="none" stroke="${mockup.fillColor === '#121212' ? '#080808' : '#FAF4EB'}" stroke-width="2.5" stroke-linecap="round" opacity="0.25"/>
          </g>
        </svg>
      `;
    } else if (mockup.type === 'hoodie') {
      svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
          <defs>
            <filter id="shadow" x="-5%" y="-5%" width="120%" height="120%">
              <feDropShadow dx="0" dy="15" stdDeviation="18" flood-opacity="0.9" flood-color="#000000" />
            </filter>
          </defs>
          <g filter="url(#shadow)">
            <!-- Heavyweight Hoodie Shell Silhouette -->
            <path d="M 195,880 C190,880 175,850 175,830 L 205,320 L 125,220 C105,210 100,195 110,180 L 150,110 C165,95 180,100 200,110 L 285,140 C315,80 485,80 515,140 L 600,110 C620,100 635,95 650,110 L 690,180 C700,195 695,210 675,220 L 595,320 L 625,830 C625,850 610,880 605,880 Z" fill="${mockup.fillColor}" stroke="${mockup.fillColor === '#121212' ? '#252525' : '#454546'}" stroke-width="2" />
            
            <!-- Large Front pouch kangaroo pocket -->
            <path d="M 280,620 L 520,620 C540,620 545,630 550,650 L 570,730 C570,740 560,750 550,750 L 250,750 C240,750 230,740 230,730 L 250,650 C255,630 260,620 280,620 Z" fill="${mockup.fillColor === '#121212' ? '#0F0F0F' : '#232324'}" stroke="${mockup.fillColor === '#121212' ? '#202021' : '#333334'}" stroke-width="1.5" />
            <path d="M 255,650 L 290,665" stroke="${mockup.fillColor === '#121212' ? '#1E1E1F' : '#2A2A2B'}" stroke-width="2" />
            <path d="M 545,650 L 510,665" stroke="${mockup.fillColor === '#121212' ? '#1E1E1F' : '#2A2A2B'}" stroke-width="2" />

            <!-- Solid Hood folds and collar contours -->
            <path d="M 330,150 C310,210 320,380 400,380 C480,380 490,210 470,150" fill="${mockup.fillColor === '#121212' ? '#0A0A0F' : '#1D1D1E'}" stroke="${mockup.fillColor === '#121212' ? '#1E1E1F' : '#2D2D2E'}" stroke-width="2" />
            <path d="M 360,150 C330,250 350,340 400,340 C450,340 470,250 440,150" fill="${mockup.fillColor}" stroke="${mockup.fillColor === '#121212' ? '#232324' : '#3D3D3E'}" stroke-width="1.5" />
            
            <path d="M 285,140 Q 400,165 515,140" fill="none" stroke="${mockup.fillColor === '#121212' ? '#202021' : '#383839'}" stroke-width="2" />
            
            <!-- Fabric creases -->
            <path d="M 240,400 Q 290,430 330,410" fill="none" stroke="${mockup.fillColor === '#121212' ? '#08080C' : '#222223'}" stroke-width="3" opacity="0.5"/>
            <path d="M 560,400 Q 510,430 470,410" fill="none" stroke="${mockup.fillColor === '#121212' ? '#08080C' : '#222223'}" stroke-width="3" opacity="0.5"/>
            <path d="M 370,165 Q 400,180 430,165" fill="none" stroke="${mockup.fillColor === '#121212' ? '#1C1C1D' : '#3C3C3D'}" stroke-width="1.5" />
          </g>
        </svg>
      `;
    }

    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent.trim())));
  };

  if (!isOpen || !file) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#070708]/95 backdrop-blur-xl z-[999] overflow-y-auto flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#0D0D10]/40 border border-white/5 w-full max-w-6xl rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col md:flex-row h-auto md:h-[80vh] min-h-[600px]"
        >
          {/* LEFT: Live Interactive Preview Workbench */}
          <div className="flex-1 bg-[#09090C] p-6 md:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 relative">
            <div className="absolute top-6 left-6 flex items-center space-x-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Calibration Desk /</span>
              <span className="text-accent text-[9px] font-black uppercase tracking-widest italic flex items-center space-x-1">
                <Compass className="w-3 h-3 text-accent animate-spin-slow mr-1" />
                <span>Step {step}: {step === 1 ? 'Design Trim' : 'Apparel Alignment'}</span>
              </span>
            </div>

            <div className="w-full h-full max-w-[400px] aspect-[4/5] flex items-center justify-center relative overflow-hidden rounded-3xl border border-white/5 bg-[#0D0D0F]" id="crop-viewport">
              {step === 1 ? (
                // STEP 1 UI: Draggable Bounding Box over original graphic
                <div 
                  ref={containerRef}
                  className="relative select-none max-w-full max-h-full"
                >
                  <img
                    ref={imageRef}
                    src={originalSrc}
                    alt="Source design"
                    className="max-w-full max-h-[50vh] object-contain rounded-xl pointer-events-none"
                  />
                  
                  {/* Glowing Draggable Crop Frame Container */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`,
                    }}
                    className="border-2 border-accent shadow-[0_0_30px_rgba(242,125,38,0.3)] cursor-move group"
                  >
                    {/* Dark shadow overlays around the cropped zone */}
                    <div className="absolute -inset-0 border border-white/5" />
                    
                    {/* Handles */}
                    {['nw', 'ne', 'sw', 'se'].map(h => (
                      <div
                        key={h}
                        onMouseDown={handleMouseDown(h)}
                        style={{
                          cursor: `${h}-resize`,
                          top: h.includes('n') ? '-4px' : 'auto',
                          bottom: h.includes('s') ? '-4px' : 'auto',
                          left: h.includes('w') ? '-4px' : 'auto',
                          right: h.includes('e') ? '-4px' : 'auto',
                        }}
                        className="absolute w-3 h-3 bg-accent rounded-full border border-black shadow-lg"
                      />
                    ))}

                    {/* Center point grabber */}
                    <div 
                      onMouseDown={handleMouseDown('center')}
                      className="absolute inset-4 flex items-center justify-center cursor-move"
                    >
                      <Move className="w-5 h-5 text-accent opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </div>
                </div>
              ) : (
                // STEP 2 UI: Apparel Mockup Assembler preview
                <div className="relative w-full h-full flex items-center justify-center select-none bg-black">
                  {selectedMockup.type !== 'none' ? (
                    <img 
                      src={getMockupSvgPath(selectedMockup)} 
                      className="absolute inset-0 w-full h-full object-cover opacity-90 transition-all duration-300"
                      alt=""
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#0E0E10] checkered-background opacity-40" />
                  )}

                  {/* Positionable Design Wrapper */}
                  <div 
                    style={{
                      position: 'absolute',
                      left: '50%',
                      // Center is 42% down for shirts, 48% down for hoodies
                      top: selectedMockup.type === 'hoodie' ? '48%' : '42%',
                      transform: `translate(-50%, -50%) translate(${designPlacement.xOffset}px, ${designPlacement.yOffset}px) scale(${designPlacement.scale / 100}) rotate(${designPlacement.rotation}deg)`,
                      transformOrigin: 'center',
                    }}
                    className="w-1/2 aspect-square flex items-center justify-center pointer-events-none"
                  >
                    <img 
                      src={croppedGraphic} 
                      className="max-w-full max-h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" 
                      alt=""
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Hidden compositor node */}
            <canvas ref={compositeCanvasRef} className="hidden" />
          </div>

          {/* RIGHT: Sophisticated Adjustment Controls Panel */}
          <div className="w-full md:w-[420px] bg-[#0E0E11] p-8 md:p-12 flex flex-col justify-between space-y-8 overflow-y-auto">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-display font-black uppercase tracking-tight text-white">
                    {step === 1 ? 'Fine Trim' : 'Mockup Engine'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                    {step === 1 ? 'Surgically isolate graphic area' : 'Position crown design onto apparel'}
                  </p>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95 duration-150"
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              {step === 1 ? (
                // STEP 1: Trimming tips and controls
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-start space-x-3">
                    <Maximize2 className="w-4 h-4 text-accent mt-0.5" />
                    <p className="text-[10px] uppercase font-black tracking-wide text-white/60 leading-normal">
                      Drag corners or the center crosshairs to bound your key graphics. Trim excess transparent margins for ultra-crisp alignment on physical stock.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 italic">Predefined Aspect Ratios</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Square 1:1', w: 60, h: 60 },
                        { label: 'Portrait 4:5', w: 56, h: 70 },
                        { label: 'Full Bounds', w: 80, h: 80 }
                      ].map((ratio, index) => (
                        <button
                          key={index}
                          onClick={() => setCropBox({ x: (100 - ratio.w) / 2, y: (100 - ratio.h) / 2, width: ratio.w, height: ratio.h })}
                          className="py-3 bg-white/5 rounded-xl border border-white/5 hover:border-accent hover:text-white text-[9px] font-black uppercase tracking-widest text-white/50 transition-all text-center"
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // STEP 2: Mockup model selecor & placement matrix variables
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 italic">Active Garment Chassis</p>
                    <div className="grid grid-cols-2 gap-2">
                      {MOCKUP_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setSelectedMockup(tpl)}
                          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group/btn ${
                            selectedMockup.id === tpl.id 
                              ? 'bg-accent/10 border-accent text-white shadow-lg' 
                              : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {tpl.type === 'shirt' && <Shirt className="w-3.5 h-3.5 text-accent" />}
                            {tpl.type === 'hoodie' && <Layers className="w-3.5 h-3.5 text-accent" />}
                            {tpl.type === 'none' && <Check className="w-3.5 h-3.5 text-accent" />}
                            <span className="text-[9px] font-black uppercase tracking-widest">{tpl.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calibration Sliders */}
                  <div className="space-y-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 italic">Matrix Alignments</p>
                    
                    {/* Scale Option */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-white/50">Graphic Zoom</span>
                        <span className="text-accent font-mono">{designPlacement.scale}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="15" 
                        max="85"
                        value={designPlacement.scale}
                        onChange={(e) => setDesignPlacement(prev => ({ ...prev, scale: parseInt(e.target.value) }))}
                        className="w-full accent-accent bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Vertical offset option */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-white/50">Vertical Placement</span>
                        <span className="text-accent font-mono">{designPlacement.yOffset > 0 ? `+${designPlacement.yOffset}` : designPlacement.yOffset}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="-150" 
                        max="150"
                        value={designPlacement.yOffset}
                        onChange={(e) => setDesignPlacement(prev => ({ ...prev, yOffset: parseInt(e.target.value) }))}
                        className="w-full accent-accent bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Horizontal offset option */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-white/50">Horizontal Shift</span>
                        <span className="text-accent font-mono">{designPlacement.xOffset > 0 ? `+${designPlacement.xOffset}` : designPlacement.xOffset}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="-100" 
                        max="100"
                        value={designPlacement.xOffset}
                        onChange={(e) => setDesignPlacement(prev => ({ ...prev, xOffset: parseInt(e.target.value) }))}
                        className="w-full accent-accent bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Rotation slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-white/50">Rotation Axis</span>
                        <span className="text-accent font-mono">{designPlacement.rotation}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="-180" 
                        max="180"
                        value={designPlacement.rotation}
                        onChange={(e) => setDesignPlacement(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                        className="w-full accent-accent bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              {step === 1 ? (
                <button
                  onClick={handleProceedToMockup}
                  className="w-full py-5 bg-white text-black hover:bg-accent text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 active:scale-95"
                >
                  <span>Lock Crop & Align Mockup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleFinalizeAndForge}
                    disabled={isUploading}
                    className="w-full py-5 bg-accent text-white hover:bg-apple-orange font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Forging Blueprint...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3px]" />
                        <span>Forge Blueprint</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setStep(1)}
                    className="w-full py-4 bg-white/5 border border-white/5 hover:border-white/10 text-white/80 hover:text-white text-[10px] uppercase font-black tracking-widest rounded-2xl transition-all duration-200"
                  >
                    Re-crop Graphic
                  </button>
                </div>
              )}

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 text-center leading-normal">
                Kings Authority System. High Definition Vectors automatically baked on render.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
