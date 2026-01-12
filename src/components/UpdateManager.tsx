import { useEffect, useState } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { toast } from 'sonner';
import { Download, RefreshCw, Sparkles, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function UpdateManager() {
    const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Notify updater that the app has started successfully
        // This prevents a rollback if the update was just applied
        CapacitorUpdater.notifyAppReady().catch(console.error);

        const checkForUpdates = async () => {
            try {
                // You can point this to your own update server or a simple JSON file
                // For demonstration, let's assume we check a backend endpoint
                // const response = await fetch('YOUR_UPDATE_SERVER_URL/check');
                // const data = await response.json();

                // This is where you would logic out if a new version is available
                // if (data.version !== currentVersion) {
                //   setUpdateInfo(data);
                // }
            } catch (error) {
                console.error('Update check failed:', error);
            }
        };

        // Only run on native platforms
        const platform = (window as any).Capacitor?.getPlatform();
        if (platform === 'android' || platform === 'ios') {
            checkForUpdates();
        }

        // Listen for app state changes to check for updates when app comes to foreground
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

            // Give the user a moment to see the success message
            setTimeout(async () => {
                await CapacitorUpdater.set({ id: result.id });
            }, 2000);

        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Update failed. Please try again later.');
            setIsUpdating(false);
        }
    };

    if (!updateInfo) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
            >
                <div className="bg-card border-2 border-primary/30 shadow-glow p-4 rounded-2xl backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 gradient-primary opacity-50" />
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
                            <RefreshCw className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black uppercase tracking-wider text-white italic">
                                Update <span className="text-primary">Detected</span>
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Version {updateInfo.version} is ready for deployment
                            </p>
                        </div>
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="gradient-primary shadow-glow text-[10px] font-black uppercase h-9 px-4 rounded-lg"
                        >
                            {isUpdating ? <Activity className="w-4 h-4 animate-spin" /> : 'Update Now'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
