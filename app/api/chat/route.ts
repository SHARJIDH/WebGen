import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getSystemPrompt } from "@/lib/prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatHistory {
    messages: Message[];
    context?: {
        workingDirectory?: string;
        projectType?: string;
        activeFiles?: string[];
    };
}

const formatConversation = (history: ChatHistory): string => {
    const { messages, context } = history;
    
    // Start with system context
    const contextParts = [];
    if (context) {
        contextParts.push('=== Environment Context ===');
        if (context.workingDirectory) {
            contextParts.push(`Working Directory: ${context.workingDirectory}`);
        }
        if (context.projectType) {
            contextParts.push(`Project Type: ${context.projectType}`);
        }
        if (context.activeFiles?.length) {
            contextParts.push('Active Files:', ...context.activeFiles.map(f => `- ${f}`));
        }
    }

    // Format messages with clear role separation
    const formattedMessages = messages.map(msg => {
        if (msg.role === 'system') {
            return `[System Instruction]\n${msg.content}\n[End System Instruction]`;
        }
        return `${msg.role.toUpperCase()}: ${msg.content}`;
    });

    return [...contextParts, ...formattedMessages].join('\n\n');
};

export async function POST(request:Request) {
    const body = await request.json();
        const incomingMessages: Message[] = body.messages || [];
        const context = body.context || {};

    try {
        const generationConfig = {
            maxOutputTokens: 10000,
            temperature: 0.7,
            topP: 1.0,
        };

        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro",
            generationConfig 
        });

        // Prepare conversation history
        const systemPrompt = getSystemPrompt();
        const chatHistory: ChatHistory = {
            messages: [
                { role: 'system', content: systemPrompt },
                ...incomingMessages
            ],
            context: {
                workingDirectory: context.workingDirectory || process.cwd(),
                projectType: context.projectType || 'unknown',
                activeFiles: context.activeFiles || []
            }
        };

        // Format the entire conversation with context
        const conversationText = formatConversation(chatHistory);

        // Generate response
        const result = await model.generateContent(conversationText);
        const response = await result.response;
        const fullResponse = response.candidates?.[0]?.content.parts[0]?.text;
        if (!fullResponse) {
            throw new Error('No response generated');
        }
        // Send response with updated context
        return NextResponse.json({
            response: fullResponse,
            context: chatHistory.context
        });

    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({ 
            error: 'Failed to generate chat response',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
