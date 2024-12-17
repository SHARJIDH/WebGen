import { GoogleGenerativeAI } from "@google/generative-ai";
import { BASE_PROMPT, getSystemPrompt } from "@/lib/prompts";
import { basePrompt as nodeBasePrompt } from "@/lib/defaults/node";
import { basePrompt as reactBasePrompt } from "@/lib/defaults/react";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function POST(req :any,res:any) {
    const prompt = req.body.prompt;
    
    try {
        const result = await model.generateContent(prompt + "\nReturn either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra");
        const response = await result.response;
        const answer = response.text().toLowerCase().trim();

        if (answer === "react") {
            return NextResponse.json({
                prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
                uiPrompts: [reactBasePrompt]
            });
        }

        if (answer === "node") {
            return NextResponse.json({
                prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
                uiPrompts: [nodeBasePrompt]
            });
        }

        return NextResponse.json({ message: "You cant access this" }, { status: 403 });
    } catch (error) {
        console.error('Template generation error:', error);
        return NextResponse.json({ error: 'Failed to generate template response' }, { status: 500 });
    }
}
