const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const { OpenAI } = require('langchain/llms/openai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const { DynamicTool } = require('langchain/tools');

export const run = async () => {
    const model = new OpenAI({ temperature: 0 });
    const tools = [

    ];
    const executor = await initializeAgentExecutorWithOptions(tools, model, {
        agentType: "zero-shot-react-description",
    });
}