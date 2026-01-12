import { useEffect, useState, useRef } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { toast } from 'sonner';
import { Download, RefreshCw, Sparkles, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function UpdateManager() {
    const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const isUpdatingRef = useRef(false);

    useEffect(() => {
        isUpdatingRef.current = isUpdating;
    }, [isUpdating]);

    useEffect(() => {
        CapacitorUpdater.notifyAppReady().catch(console.error);

        const checkForUpdates = async () => {
            try {
                const platform = (window as any).Capacitor?.getPlatform();
                if (platform !== 'android' && platform !== 'ios') return;

                const CURRENT_VERSION = '2.0.1';
                const API_URL = import.meta.env.VITE_API_URL || 'https://the-exam-edge-backend.onrender.com/api';
                const response = await fetch(`${API_URL}/system/check`);
                const data = await response.json();

                if (data.version && data.version !== CURRENT_VERSION) {
                    setUpdateInfo({
                        version: data.version,
                        url: data.url
                    });
                    setIsVisible(true);

                    // Auto-hide after 8 seconds
                    setTimeout(() => {
                        if (!isUpdatingRef.current) {
                            setIsVisible(false);
                        }
                    }, 8000);
                }
            } catch (error) {
                console.error('Update check failed:', error);
            }
        };

        checkForUpdates();

        const handleAppStateChange = App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                checkForUpdates();
            }
        });

        return () => {
            handleAppStateChange.then(l => l.remove());
        };
    }, []);

    const handleUpdate = async () => {
        if (!updateInfo) return;

        setIsUpdating(true);
        try {
            toast.info('Downloading system update...', {
                icon: <Download className="w-4 h-4" />,
            });

            const result = await CapacitorUpdater.download({
                url: updateInfo.url,
                version: updateInfo.version,
            });

            toast.success('Update ready! Refreshing terminal...', {
                icon: <Sparkles className="w-4 h-4" />,
            });

            setTimeout(async () => {
                await CapacitorUpdater.set({ id: result.id });
            }, 2000);

        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Update failed. Connection lost or invalid version.');
            setIsUpdating(false);
        }
    };

    if (!updateInfo) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
                >
                    <div className="bg-card/90 border-2 border-primary/30 shadow-glow p-4 rounded-3xl backdrop-blur-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 gradient-primary opacity-50" />

                        <button
                            onClick={() => setIsVisible(false)}
                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center animate-pulse shadow-glow">
                                <RefreshCw className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-black uppercase tracking-wider text-foreground italic">
                                    Update <span className="text-primary">Detected</span>
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                    v{updateInfo.version} ready for sync
                                </p>
                            </div>
                            <Button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="gradient-primary shadow-glow text-[10px] font-black uppercase h-10 px-6 rounded-xl"
                            >
                                {isUpdating ? <Activity className="w-4 h-4 animate-spin" /> : 'Sync Now'}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
