import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let devProcess: WebContainerProcess | undefined;

    const setupPreview = async () => {
      try {
        if (!webContainer) return;
        setLoading(true);
        setError(null);

        // Create file system structure
        const fileSystem: Record<string, any> = {};
        
        // Process files and create directory structure
        for (const file of files) {
          if (file.type === 'file') {
            const pathParts = file.path.split('/').filter(Boolean);
            let current = fileSystem;
            
            // Create nested directory structure
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i];
              if (!current[part]) {
                current[part] = {};
              }
              current = current[part];
            }
            
            // Add file content
            const fileName = pathParts[pathParts.length - 1];
            current[fileName] = {
              file: {
                contents: file.content
              }
            };
          }
        }

        console.log('Writing files to WebContainer:', fileSystem);
        await webContainer.mount(fileSystem);

        // Install dependencies
        console.log('Installing dependencies...');
        const installProcess = await webContainer.spawn('npm', ['install']);
        
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log('Install output:', data);
            },
          })
        );

        const exitCode = await installProcess.exit;
        
        if (exitCode !== 0) {
          throw new Error('Installation failed');
        }

        // Start the dev server
        console.log('Starting dev server...');
        devProcess = await webContainer.spawn('npm', ['run', 'dev']);
        
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log('Server output:', data);
            },
          })
        );

        // Wait for server to be ready
        webContainer.on('server-ready', (port, url) => {
          console.log('Server is ready on:', url);
          if (isMounted) {
            setUrl(url);
            setLoading(false);
          }
        });

      } catch (err) {
        console.error('Preview setup error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to set up preview');
          setLoading(false);
        }
      }
    };

    setupPreview();

    return () => {
      isMounted = false;
      if (devProcess) {
        devProcess.kill();
      }
    };
  }, [webContainer, files]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!url) {
    return <div className="p-4">Waiting for preview server...</div>;
  }

  return (
    <div className="h-full">
      <iframe
        src={url}
        className="w-full h-full border-0"
        allow="cross-origin-isolated"
      />
    </div>
  );
}