import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Sparkles, 
  Play, 
  Download, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Clock,
  Film
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'react-hot-toast';
import { cn } from '@/src/lib/utils';

interface VeoVideoGeneratorProps {
  product: any;
  startingImage?: string;
  onVideoGenerated?: (videoUrl: string) => void;
}

export function VeoVideoGenerator({ product, startingImage, onVideoGenerated }: VeoVideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState(`A cinematic lifestyle shot of a person wearing a ${product.category} in a vibrant ${product.category === 'T-Shirts' ? 'urban street' : 'high-end studio'} setting, moody lighting, matching the aesthetic of kings clothing brand.`);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const checkApiKey = async () => {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
    return true;
  };

  const generatePromoVideo = async () => {
    setIsGenerating(true);
    setGeneratedVideoUrl(null);
    setStatusMessage('Initializing Veo Engine...');

    try {
      await checkApiKey();
      
      const apiKey = process.env.API_KEY || (process.env as any).GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key missing');

      const ai = new GoogleGenAI({ apiKey });
      
      setStatusMessage('Forging Cinematic Assets...');

      // Convert image to base64 if provided
      let imagePart = undefined;
      if (startingImage && startingImage.startsWith('data:')) {
        const [mime, data] = startingImage.split(';base64,');
        imagePart = {
          imageBytes: data,
          mimeType: mime.split(':')[1]
        };
      } else if (startingImage) {
        // If it's a URL, we might need to fetch it or just use prompt-only
        // For simplicity, we'll try to fetch if it's an external URL, but usually we need base64
        try {
            const resp = await fetch(startingImage);
            const blob = await resp.blob();
            const reader = new FileReader();
            const base64: any = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            const [mime, data] = base64.split(';base64,');
            imagePart = {
                imageBytes: data,
                mimeType: mime.split(':')[1]
            };
        } catch (e) {
            console.warn('Failed to fetch image for starting frame, falling back to prompt only', e);
        }
      }

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        image: imagePart,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      });

      setStatusMessage('Veo is rendering your vision. This can take up to 2 minutes...');

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 * 10s = 300s = 5mins
      
      while (!operation.done && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        switch(attempts) {
            case 3: setStatusMessage('Stitching temporal frames...'); break;
            case 6: setStatusMessage('Applying cinematic lighting filters...'); break;
            case 10: setStatusMessage('Finalizing lifestyle setting render...'); break;
            case 15: setStatusMessage('Still processing, quality takes time...'); break;
        }

        try {
            operation = await ai.operations.getVideosOperation({ operation: operation });
        } catch (pollError: any) {
            if (pollError.message?.includes('Requested entity was not found')) {
                toast.error('API Session Expired. Please re-select key.');
                await (window as any).aistudio.openSelectKey();
                throw pollError;
            }
            throw pollError;
        }
      }

      if (!operation.done) {
        throw new Error('Video generation timed out. Please try again.');
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error('No video URI returned');

      // Fetch the video with the API key
      const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!videoResponse.ok) throw new Error('Failed to download generated video');

      const videoBlob = await videoResponse.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      
      setGeneratedVideoUrl(videoUrl);
      setStatusMessage('Promotion Video Forged Successfully');
      if (onVideoGenerated) onVideoGenerated(videoUrl);
      toast.success('Cinematic Asset Ready');

    } catch (error: any) {
      console.error('Veo Error:', error);
      toast.error(error.message || 'Failed to generate video');
      setStatusMessage('Forging Failed: ' + (error.message || 'Internal Error'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass rounded-[2.5rem] border border-white/10 overflow-hidden">
      <div className="p-8 border-b border-white/5 bg-accent/5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-accent/10 rounded-2xl">
            <Film className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-display font-black uppercase italic tracking-tight text-white">Veo Kinetic Creator</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Forge High-Impact Promo Videos</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-black/40 rounded-full border border-white/5">
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
           <span className="text-[8px] font-black uppercase tracking-widest text-white/40">VEOR3.1 ACTIVE</span>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {!generatedVideoUrl ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Creative Direction Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="Describe the lifestyle setting..."
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-accent/40 transition-all min-h-[120px] resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
               <button
                  onClick={generatePromoVideo}
                  disabled={isGenerating || !prompt.trim()}
                  className={cn(
                    "flex-1 group relative py-6 rounded-full font-black text-[12px] uppercase tracking-[0.2em] transition-all overflow-hidden shadow-2xl",
                    isGenerating 
                      ? "bg-white/5 text-white/20 cursor-wait" 
                      : "bg-accent text-black hover:scale-[1.02] active:scale-[0.98]"
                  )}
               >
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    {isGenerating ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    )}
                    <span>{isGenerating ? 'Forging Content...' : 'Forge Promotional Asset'}</span>
                  </div>
                  {isGenerating && (
                    <motion.div 
                      className="absolute inset-0 bg-accent/20"
                      initial={{ left: "-100%" }}
                      animate={{ left: "100%" }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
               </button>
               
               <button
                  onClick={() => (window as any).aistudio.openSelectKey()}
                  className="px-8 py-6 rounded-full bg-white/5 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3"
               >
                  <Lock className="w-4 h-4" />
                  API Access
               </button>
            </div>

            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-accent/5 border border-accent/10 rounded-3xl space-y-4"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent shadow-[0_0_15px_rgba(255,232,0,0.5)]"
                      animate={{ 
                        width: ["10%", "90%"],
                      }}
                      transition={{ duration: 60, ease: "easeOut" }}
                    />
                  </div>
                  <Clock className="w-4 h-4 text-accent animate-pulse" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                   <p className="text-accent">{statusMessage}</p>
                   <p className="text-white/20">Approx 120s</p>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
             <div className="relative aspect-[9/16] max-w-[320px] mx-auto rounded-[2.5rem] overflow-hidden border-2 border-accent/20 shadow-[0_0_100px_rgba(255,232,0,0.15)] bg-black">
                <video 
                   src={generatedVideoUrl} 
                   controls 
                   autoPlay 
                   loop
                   className="w-full h-full object-cover" 
                />
                <div className="absolute top-6 right-6 p-3 bg-accent text-black rounded-2xl shadow-xl">
                   <Video className="w-5 h-5" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <a 
                   href={generatedVideoUrl} 
                   download={`${product.name}_promo.mp4`}
                   className="py-5 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-accent transition-all"
                >
                   <Download className="w-4 h-4" />
                   Download Asset
                </a>
                <button
                   onClick={() => setGeneratedVideoUrl(null)}
                   className="py-5 bg-white/5 border border-white/10 text-white rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                >
                   <RefreshCw className="w-4 h-4" />
                   Discard & Re-Forge
                </button>
             </div>
             
             <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl flex items-center space-x-4">
                <div className="p-2 bg-green-500/20 rounded-xl">
                   <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Master Asset Verified</p>
                   <p className="text-[8px] font-black uppercase tracking-widest text-white/30 italic">Ready for social broadcast deployment</p>
                </div>
             </div>
          </div>
        )}

        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl flex items-start space-x-4">
           <AlertCircle className="w-5 h-5 text-white/20 mt-1" />
           <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 italic">Hardware Note</p>
              <p className="text-[8px] font-medium text-white/20 leading-relaxed">
                 Veo R3.1 requires a significant computational overhead. Ensure you have authorized a paid API key via the billing portal (ai.google.dev/gemini-api/docs/billing) before proceeding with cinematic renders.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
