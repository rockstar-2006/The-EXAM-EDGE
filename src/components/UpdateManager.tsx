import { useEffect, useState } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { toast } from 'sonner';
import { Download, RefreshCw, Sparkles, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function UpdateManager() {
    const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

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
                    const dismissedVersion = localStorage.getItem('dismissedUpdateVersion');
                    if (dismissedVersion !== data.version) {
                        setUpdateInfo({
                            version: data.version,
                            url: data.url
                        });
                    }
                }
            } catch (error) {
                console.error('Update check failed:', error);
            }
        };

        const platform = (window as any).Capacitor?.getPlatform();
        if (platform === 'android' || platform === 'ios') {
            checkForUpdates();
        }

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
            toast.info('Downloading update...', {
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
                setIsUpdating(false);
            }, 2000);
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Update failed. Please try again later.');
            setIsUpdating(false);
        }
    };

    const handleDismiss = () => {
        if (updateInfo) {
            localStorage.setItem('dismissedUpdateVersion', updateInfo.version);
        }
        setIsDismissed(true);
    };

    if (!updateInfo || isDismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm"
            >
                <div className="bg-card/95 border border-primary/20 shadow-glow p-4 rounded-3xl backdrop-blur-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] gradient-primary opacity-60" />

                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-lg">
                            <RefreshCw className="w-6 h-6 text-white animate-spin-slow" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                            <h3 className="text-xs font-black uppercase tracking-wider text-foreground italic truncate">
                                Terminal <span className="text-primary italic">Update</span>
                            </h3>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                Deploy v{updateInfo.version}
                            </p>
                        </div>
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            size="sm"
                            className="gradient-primary shadow-glow text-[10px] font-black uppercase h-9 px-4 rounded-xl shrink-0"
                        >
                            {isUpdating ? <Activity className="w-4 h-4 animate-spin" /> : 'Deploy'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
export default UpdateManager;
