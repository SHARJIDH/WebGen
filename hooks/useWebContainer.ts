import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

async function getWebContainer() {
    if (webcontainerInstance) return webcontainerInstance;
    
    if (!bootPromise) {
        bootPromise = WebContainer.boot();
    }
    
    try {
        webcontainerInstance = await bootPromise;
        return webcontainerInstance;
    } catch (error) {
        bootPromise = null;
        throw error;
    }
}

export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function initWebContainer() {
            try {
                const instance = await getWebContainer();
                if (mounted) {
                    setWebcontainer(instance);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to initialize WebContainer');
                    setWebcontainer(null);
                }
            }
        }

        initWebContainer();

        return () => {
            mounted = false;
        };
    }, []);

    return { webcontainer, error };
}