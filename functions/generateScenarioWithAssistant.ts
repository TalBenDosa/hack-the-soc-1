/**
 * Generate Scenario using OpenAI Assistant
 * 
 * This function communicates with a specific OpenAI Assistant to generate
 * complete SOC training scenarios with 10 realistic, correlated logs.
 */

export default async function generateScenarioWithAssistant(context) {
  const { attackType, difficulty, companyContext } = context.arguments;
  const { OPENAI_API_KEY } = context.secrets;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const ASSISTANT_ID = 'asst_7yNQuVVkdZPBNO7FWJsuyISa';

  // Build the prompt for the assistant
  const prompt = `Generate a complete SOC incident scenario with the following requirements:

Attack Type: ${attackType || 'Random realistic attack'}
Difficulty: ${difficulty || 'Medium'}
Company Context: ${companyContext || 'Enterprise organization with 500+ employees'}

Requirements:
1. Create one realistic SOC incident scenario storyline (attack narrative + timeline)
2. Produce exactly 10 logs representing the same incident
3. Each log must be from a DIFFERENT data source (EDR, Firewall, AD, Office 365, etc.)
4. Logs must be realistic, internally consistent, and match the story timeline
5. Use real field names and structures from actual security products

Return STRICTLY valid JSON matching this schema:
{
  "title": "scenario title",
  "description": "2-3 sentence description",
  "difficulty": "${difficulty || 'Medium'}",
  "category": "attack category",
  "learning_objectives": ["objective1", "objective2", "objective3", "objective4"],
  "tags": ["tag1", "tag2", "tag3"],
  "initial_events": [
    {
      "id": "unique_id",
      "timestamp": "ISO 8601",
      "source_type": "Data Source Name",
      "rule_description": "event description",
      "hostname": "hostname",
      "username": "username",
      "ip_address": "ip",
      "severity": "Low/Medium/High/Critical",
      "raw_log_data": { ...detailed fields... },
      "default_classification": "True Positive" or "False Positive"
    }
    ... 10 logs total
  ]
}`;

  try {
    // Step 1: Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${await threadResponse.text()}`);
    }

    const thread = await threadResponse.json();
    const threadId = thread.id;

    // Step 2: Add message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: prompt
      })
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to add message: ${await messageResponse.text()}`);
    }

    // Step 3: Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
      })
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${await runResponse.text()}`);
    }

    const run = await runResponse.json();
    const runId = run.id;

    // Step 4: Poll for completion (max 60 seconds)
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${await statusResponse.text()}`);
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run did not complete. Status: ${runStatus}`);
    }

    // Step 5: Get the messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error(`Failed to get messages: ${await messagesResponse.text()}`);
    }

    const messages = await messagesResponse.json();
    
    // Get the assistant's response (first message in the list)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
      throw new Error('No response from assistant');
    }

    let generatedContent = assistantMessage.content[0].text.value;

    // Clean up markdown if present
    if (generatedContent.includes('```json')) {
      generatedContent = generatedContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (generatedContent.includes('```')) {
      generatedContent = generatedContent.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Parse JSON
    let scenarioData;
    try {
      scenarioData = JSON.parse(generatedContent);
    } catch (error) {
      throw new Error(`Failed to parse scenario JSON: ${error.message}`);
    }

    // Validate structure
    if (!scenarioData.title || !scenarioData.initial_events || scenarioData.initial_events.length !== 10) {
      throw new Error('Generated scenario does not meet requirements (must have title and exactly 10 logs)');
    }

    // Step 6: Save scenario to database
    const user = await context.auth.me();
    let tenantId = null;
    
    if (user.role === 'admin') {
      scenarioData.is_global = true;
      scenarioData.created_by_super_admin = true;
      scenarioData.tenant_id = null;
    } else {
      const tenantUsers = await context.entities.TenantUser.filter({ 
        user_id: user.id, 
        status: 'active' 
      });
      
      if (tenantUsers.length > 0) {
        tenantId = tenantUsers[0].tenant_id;
      }
      
      scenarioData.tenant_id = tenantId;
      scenarioData.is_global = false;
      scenarioData.created_by_super_admin = false;
    }

    const savedScenario = await context.entities.Scenario.create(scenarioData);

    return {
      success: true,
      scenario: savedScenario,
      assistant_id: ASSISTANT_ID,
      thread_id: threadId,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error generating scenario with assistant:', error);
    throw error;
  }
}