"use client"

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StepsList } from '@/components/StepsList';
import { FileExplorer } from '@/components/FileExplorer';
import { TabView } from '@/components/TabView';
import { CodeEditor } from '@/components/CodeEditor';
import { PreviewFrame } from '@/components/PreviewFrame';
import { Step, FileItem, StepType } from '@/types';
import { useWebContainer } from '@/hooks/useWebContainer';
import { parseXml } from '@/steps';
import axios from 'axios';
import { BACKEND_URL } from '@/config';
import { Loader } from '@/components/Loader';

interface BuilderProps {}

const Builder: React.FC<BuilderProps> = () => {
    const searchParams = useSearchParams();
    const prompt = searchParams.get('prompt') || '';
    const [userPrompt, setPrompt] = useState("");
    const [llmMessages, setLlmMessages] = useState<{ role: "user" | "assistant", content: string; }[]>([]);
    const [loading, setLoading] = useState(false);
    const [templateSet, setTemplateSet] = useState(false);
    const { webcontainer, error: webContainerError } = useWebContainer();

    const [currentStep, setCurrentStep] = useState(1);
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [steps, setSteps] = useState<Step[]>([]);

    useEffect(() => {
        if (!steps.length) return;

        let originalFiles = [...files];
        let updateHappened = false;
        
        steps.filter(({status}) => status === "pending").forEach(step => {
            updateHappened = true;
            if (step?.type === StepType.CreateFile && step.path) {
                let parsedPath = step.path.split("/");
                let currentFileStructure = originalFiles;
                
                let currentFolder = "";
                for (let i = 0; i < parsedPath.length; i++) {
                    const part = parsedPath[i];
                    if (!part) continue;
                    
                    currentFolder = `${currentFolder}/${part}`;
                    
                    if (i === parsedPath.length - 1) {
                        // It's a file
                        const existingFile = currentFileStructure.find(x => x.path === currentFolder);
                        if (existingFile) {
                            existingFile.content = step.code || '';
                        } else {
                            currentFileStructure.push({
                                name: part,
                                type: 'file',
                                path: currentFolder,
                                content: step.code || ''
                            });
                        }
                    } else {
                        // It's a folder
                        let folder = currentFileStructure.find(x => x.path === currentFolder);
                        if (!folder) {
                            folder = {
                                name: part,
                                type: 'folder',
                                path: currentFolder,
                                children: []
                            };
                            currentFileStructure.push(folder);
                        }
                        currentFileStructure = folder.children || [];
                    }
                }
            }
        });

        if (updateHappened) {
            console.log('Updating files:', originalFiles);
            setFiles(originalFiles);
            setSteps(currentSteps => 
                currentSteps.map(s => ({
                    ...s,
                    status: "completed"
                }))
            );
        }
    }, [steps]);

    useEffect(() => {
        if (!webcontainer || !files.length) return;

        async function mountFiles() {
            try {
                console.log('Creating mount structure...');
                const mountStructure: Record<string, any> = {};
                
                for (const file of files) {
                    if (file.type === 'file') {
                        mountStructure[file.name] = {
                            file: { contents: file.content }
                        };
                    } else if (file.type === 'folder') {
                        mountStructure[file.name] = {
                            directory: {}
                        };
                        
                        if (file.children) {
                            const processChildren = (children: FileItem[], parentPath: string = '') => {
                                const result: Record<string, any> = {};
                                for (const child of children) {
                                    if (child.type === 'file') {
                                        result[child.name] = {
                                            file: { contents: child.content }
                                        };
                                    } else if (child.type === 'folder') {
                                        result[child.name] = {
                                            directory: child.children ? processChildren(child.children, `${parentPath}/${child.name}`) : {}
                                        };
                                    }
                                }
                                return result;
                            };
                            
                            mountStructure[file.name].directory = processChildren(file.children);
                        }
                    }
                }

                console.log('Mount structure:', mountStructure);
                await webcontainer?.mount(mountStructure);
                console.log('Files mounted successfully');
            } catch (error) {
                console.error('Error mounting files:', error);
            }
        }

        mountFiles();
    }, [files, webcontainer]);

    async function init() {
        try {
            setLoading(true);
            const response = await axios.post(`${BACKEND_URL}/template`, {
                prompt: prompt.trim()
            });
            
            const { prompts, uiPrompts } = response.data;
            console.log('Template response:', response.data);

            const initialSteps = parseXml(uiPrompts[0]);
            console.log('Initial steps:', initialSteps);
            
            setSteps(initialSteps.map((x: Step) => ({
                ...x,
                status: "pending"
            })));

            const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                messages: [...prompts, prompt].map(content => ({
                    role: "user",
                    content
                })),
                context: {
                    workingDirectory: '/app',
                    projectType: 'react',
                    activeFiles: files.map(f => f.path)
                }
            });

            console.log('Steps response:', stepsResponse.data);
            const chatSteps = parseXml(stepsResponse.data.response);
            console.log('Chat steps:', chatSteps);

            setSteps(s => [...s, ...chatSteps.map(x => ({
                ...x,
                status: "pending" as "pending"
            }))]);

            setLlmMessages([...prompts, prompt].map(content => ({
                role: "user",
                content
            })));

            setLlmMessages(x => [...x, { role: "assistant", content: stepsResponse.data.response }]);
            setTemplateSet(true);
        } catch (error) {
            console.error('Error in init:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!prompt) return;
        init();
    }, [prompt]);

    const handleSubmit = async () => {
        if (!userPrompt) return;

        setLoading(true);
        const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
            messages: [...llmMessages, { role: "user", content: userPrompt }],
            context: {
                workingDirectory: '/app',
                projectType: 'react',
                activeFiles: files.map(f => f.path)
            }
        });

        setLoading(false);

        setLlmMessages(x => [...x, { role: "user", content: userPrompt }]);
        setLlmMessages(x => [...x, { role: "assistant", content: stepsResponse.data.response }]);

        setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
            ...x,
            status: "pending" as "pending"
        }))]);

        setPrompt('');
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {loading && <Loader />}
            {webContainerError && (
                <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 text-center">
                    WebContainer Error: {webContainerError}
                </div>
            )}
            <div className="flex-1 overflow-hidden">
                <div className="h-full grid grid-cols-4 gap-6 p-6">
                    <div className="col-span-1 space-y-6 overflow-auto">
                        <div>
                            <div className="max-h-[75vh] overflow-scroll">
                                <StepsList
                                    steps={steps}
                                    currentStep={currentStep}
                                    onStepClick={setCurrentStep}
                                />
                            </div>
                            <div>
                                <div className='flex'>
                                    <br />
                                    {(loading || !templateSet) && <Loader />}
                                    {!(loading || !templateSet) && (
                                        <div className='flex'>
                                            <textarea 
                                                value={userPrompt} 
                                                onChange={(e) => setPrompt(e.target.value)} 
                                                className='p-2 w-full'
                                            />
                                            <button 
                                                onClick={handleSubmit} 
                                                className='bg-purple-400 px-4'
                                            >
                                                Send
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1">
                        <FileExplorer
                            files={files}
                            onFileSelect={setSelectedFile}
                        />
                    </div>
                    <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
                        <TabView activeTab={activeTab} onTabChange={setActiveTab} />
                        <div className="h-[calc(100%-4rem)]">
                            {activeTab === 'code' ? (
                                <CodeEditor file={selectedFile} />
                            ) : (
                                <PreviewFrame webContainer={webcontainer} files={files} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Builder;