import React, { useState } from 'react';
import { getApiBase } from '../constants';
import { Check, X, Loader, AlertCircle, Server, Database, Key, Globe } from './icons';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

const BackendTestPanel: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [apiBase, setApiBase] = useState(getApiBase());

  const runTests = async () => {
    // Normalize the backend base URL (remove trailing slashes)
    const baseUrl = apiBase.replace(/\/+$/, '');

    setIsTesting(true);
    setResults([]);

    const testResults: TestResult[] = [];

    // Test 1: Check environment variables
    testResults.push({
      name: 'Environment Variables',
      status: 'pending',
      message: 'Checking configuration...',
    });
    setResults([...testResults]);

    const viteApiBase = (import.meta as any).env?.VITE_API_BASE;
    const viteGeminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    testResults[0] = {
      name: 'Environment Variables',
      status: 'success',
      message: `VITE_API_BASE: ${viteApiBase || 'Not set (using default)'}\nVITE_GEMINI_API_KEY: ${viteGeminiKey ? 'Set' : 'Not set'}`,
      details: { viteApiBase, viteGeminiKey: viteGeminiKey ? '***hidden***' : null },
    };
    setResults([...testResults]);

    // Test 2: Backend Health Check
    testResults.push({
      name: 'Backend Health Check',
      status: 'pending',
      message: 'Testing backend connection...',
    });
    setResults([...testResults]);

    try {
      const healthUrl = `${baseUrl}/health`;
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let healthResponse: Response;
      try {
        healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Re-throw to be caught by outer catch
        throw fetchError;
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        testResults[1] = {
          name: 'Backend Health Check',
          status: 'success',
          message: `Backend is running! Service: ${healthData.service || 'unknown'}`,
          details: { url: healthUrl, status: healthResponse.status, data: healthData },
        };
      } else {
        testResults[1] = {
          name: 'Backend Health Check',
          status: 'error',
          message: `Backend returned error: ${healthResponse.status} ${healthResponse.statusText}`,
          details: { url: healthUrl, status: healthResponse.status },
        };
      }
    } catch (error: any) {
      const isTimeout = error.message?.includes('timeout') || error.message?.includes('Failed to fetch') || error.name === 'AbortError' || error.code === 'ECONNABORTED';
      testResults[1] = {
        name: 'Backend Health Check',
        status: 'error',
        message: isTimeout 
          ? `⏱️ Request timed out after 10 seconds.\n\n🔴 ROOT CAUSE: MongoDB connection failing!\n\nBackend error: "Operation mintrequests.findOne() buffering timed out"\n\n✅ FIX:\n1. Railway → "web" service → Variables\n2. Find "MONGODB_URL" → Rename to "MONGODB_URI"\n3. Value: mongodb://mongo:...@mongodb.railway.internal:27017\n4. Apply changes → Restart service\n\nAfter fix, check logs for: "✅ Mongo connected"`
          : `Failed to connect: ${error.message || error}`,
        details: { 
          url: `${baseUrl}/health`, 
          error: error.message || String(error), 
          type: error.name || 'Unknown',
          suggestion: 'MONGODB_URI variable is missing/wrong in Railway. This blocks all database operations.'
        },
      };
    }
    setResults([...testResults]);

    // Test 3: CORS Test
    testResults.push({
      name: 'CORS Configuration',
      status: 'pending',
      message: 'Testing CORS...',
    });
    setResults([...testResults]);

    try {
      const corsTestUrl = `${baseUrl}/health`;
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const corsResponse = await fetch(corsTestUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const corsHeaders = {
        'access-control-allow-origin': corsResponse.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': corsResponse.headers.get('access-control-allow-methods'),
      };

      if (corsResponse.status === 204 || corsHeaders['access-control-allow-origin']) {
        testResults[2] = {
          name: 'CORS Configuration',
          status: 'success',
          message: `CORS is configured. Allowed origin: ${corsHeaders['access-control-allow-origin'] || 'Not specified'}`,
          details: corsHeaders,
        };
      } else {
        testResults[2] = {
          name: 'CORS Configuration',
          status: 'error',
          message: `CORS may not be properly configured. Status: ${corsResponse.status}`,
          details: { status: corsResponse.status, headers: corsHeaders },
        };
      }
    } catch (error: any) {
      const isTimeout = error.message?.includes('timeout') || error.message?.includes('Failed to fetch');
      testResults[2] = {
        name: 'CORS Configuration',
        status: 'error',
        message: isTimeout
          ? `Cannot test CORS - backend is not reachable.\n\nFix the backend connection first, then CORS can be tested.`
          : `CORS test failed: ${error.message}`,
        details: { 
          error: error.message,
          note: 'CORS test requires backend to be reachable first'
        },
      };
    }
    setResults([...testResults]);

    // Test 4: Persona Generate Details Endpoint
    testResults.push({
      name: 'Persona Generate Details API',
      status: 'pending',
      message: 'Testing persona generation endpoint...',
    });
    setResults([...testResults]);

    try {
      const personaUrl = `${baseUrl}/api/persona/generate-details`;
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for AI calls
      
      const personaResponse = await fetch(personaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test persona',
          archetype: 'Sentinel',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (personaResponse.ok) {
        const personaData = await personaResponse.json();
        testResults[3] = {
          name: 'Persona Generate Details API',
          status: 'success',
          message: `API working! Generated: ${personaData.name || 'Unknown'}`,
          details: { url: personaUrl, status: personaResponse.status, data: personaData },
        };
      } else {
        const errorData = await personaResponse.json().catch(() => ({ message: `HTTP ${personaResponse.status}` }));
        testResults[3] = {
          name: 'Persona Generate Details API',
          status: 'error',
          message: `API error: ${errorData.message || errorData.error || personaResponse.statusText}`,
          details: { url: personaUrl, status: personaResponse.status, error: errorData },
        };
      }
    } catch (error: any) {
      const isTimeout = error.message?.includes('timeout') || error.message?.includes('Failed to fetch');
      testResults[3] = {
        name: 'Persona Generate Details API',
        status: 'error',
        message: isTimeout
          ? `Backend API not reachable.\n\nThis is why persona generation fails. Deploy backend first.`
          : `Request failed: ${error.message}`,
        details: { 
          url: `${baseUrl}/api/persona/generate-details`, 
          error: error.message, 
          type: error.name,
          impact: 'Persona generation will not work until backend is deployed'
        },
      };
    }
    setResults([...testResults]);

    // Test 5: NFT Generate Image Endpoint
    testResults.push({
      name: 'NFT Generate Image API',
      status: 'pending',
      message: 'Testing NFT image generation endpoint...',
    });
    setResults([...testResults]);

    try {
      const nftUrl = `${baseUrl}/api/nft/generate-image`;
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for AI calls
      
      const nftResponse = await fetch(nftUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test NFT image',
          theme: 'artifact',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (nftResponse.ok) {
        const nftData = await nftResponse.json();
        testResults[4] = {
          name: 'NFT Generate Image API',
          status: 'success',
          message: `API working! Image generated successfully`,
          details: { url: nftUrl, status: nftResponse.status, hasImage: !!nftData.imageUrl },
        };
      } else {
        const errorData = await nftResponse.json().catch(() => ({ message: `HTTP ${nftResponse.status}` }));
        testResults[4] = {
          name: 'NFT Generate Image API',
          status: 'error',
          message: `API error: ${errorData.message || errorData.error || nftResponse.statusText}`,
          details: { url: nftUrl, status: nftResponse.status, error: errorData },
        };
      }
    } catch (error: any) {
      const isTimeout = error.message?.includes('timeout') || error.message?.includes('Failed to fetch');
      testResults[4] = {
        name: 'NFT Generate Image API',
        status: 'error',
        message: isTimeout
          ? `Backend API not reachable.\n\nThis is why NFT minting fails. Deploy backend first.`
          : `Request failed: ${error.message}`,
        details: { 
          url: `${baseUrl}/api/nft/generate-image`, 
          error: error.message, 
          type: error.name,
          impact: 'NFT generation and minting will not work until backend is deployed'
        },
      };
    }
    setResults([...testResults]);

    setIsTesting(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black border border-zinc-800 rounded-lg p-6 max-w-4xl w-[90vw] max-h-[90vh] shadow-2xl flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="w-6 h-6" />
          Backend Connection Test
        </h3>
        <button
          onClick={() => setResults([])}
          className="text-zinc-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-4 flex-shrink-0">
        <label className="block text-sm text-zinc-400 mb-2 font-medium">Backend URL:</label>
        <input
          type="text"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://your-backend.railway.app"
        />
      </div>

      <button
        onClick={runTests}
        disabled={isTesting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 mb-4 flex-shrink-0 transition-colors"
      >
        {isTesting ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Globe className="w-4 h-4" />
            Run Tests
          </>
        )}
      </button>

      {results.length > 0 && (
        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
          {results.map((result, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                result.status === 'success'
                  ? 'border-green-500 bg-green-500/10'
                  : result.status === 'error'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-zinc-700 bg-zinc-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.status === 'pending' && (
                  <Loader className="w-5 h-5 text-zinc-400 animate-spin mt-0.5 flex-shrink-0" />
                )}
                {result.status === 'success' && (
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                )}
                {result.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-base mb-2">{result.name}</div>
                  <div className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap leading-relaxed">
                    {result.message}
                  </div>
                  {result.details && (
                    <details className="mt-3" open={result.status === 'error'}>
                      <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300 font-medium mb-2">
                        ▼ Show Details
                      </summary>
                      <pre className="text-xs text-zinc-300 mt-2 bg-zinc-950 p-3 rounded border border-zinc-800 overflow-x-auto max-w-full break-all">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BackendTestPanel;
