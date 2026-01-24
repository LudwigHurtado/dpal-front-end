import React, { useState } from 'react';
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
  const [apiBase, setApiBase] = useState(
    (import.meta as any).env?.VITE_API_BASE || 'https://dpal-ai-server-production.up.railway.app'
  );

  const runTests = async () => {
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
      const healthUrl = `${apiBase}/health`;
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

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
      testResults[1] = {
        name: 'Backend Health Check',
        status: 'error',
        message: `Failed to connect: ${error.message}`,
        details: { url: `${apiBase}/health`, error: error.message, type: error.name },
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
      const corsTestUrl = `${apiBase}/health`;
      const corsResponse = await fetch(corsTestUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
        },
      });

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
      testResults[2] = {
        name: 'CORS Configuration',
        status: 'error',
        message: `CORS test failed: ${error.message}`,
        details: { error: error.message },
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
      const personaUrl = `${apiBase}/api/persona/generate-details`;
      const personaResponse = await fetch(personaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test persona',
          archetype: 'Sentinel',
        }),
      });

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
      testResults[3] = {
        name: 'Persona Generate Details API',
        status: 'error',
        message: `Request failed: ${error.message}`,
        details: { url: `${apiBase}/api/persona/generate-details`, error: error.message, type: error.name },
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
      const nftUrl = `${apiBase}/api/nft/generate-image`;
      const nftResponse = await fetch(nftUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test NFT image',
          theme: 'artifact',
        }),
      });

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
      testResults[4] = {
        name: 'NFT Generate Image API',
        status: 'error',
        message: `Request failed: ${error.message}`,
        details: { url: `${apiBase}/api/nft/generate-image`, error: error.message, type: error.name },
      };
    }
    setResults([...testResults]);

    setIsTesting(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black border border-zinc-800 rounded-lg p-6 max-w-md shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5" />
          Backend Connection Test
        </h3>
        <button
          onClick={() => setResults([])}
          className="text-zinc-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">Backend URL:</label>
        <input
          type="text"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
          placeholder="https://your-backend.railway.app"
        />
      </div>

      <button
        onClick={runTests}
        disabled={isTesting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 mb-4"
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
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={index}
              className={`border rounded p-3 ${
                result.status === 'success'
                  ? 'border-green-500 bg-green-500/10'
                  : result.status === 'error'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-zinc-700 bg-zinc-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.status === 'pending' && (
                  <Loader className="w-4 h-4 text-zinc-400 animate-spin mt-0.5" />
                )}
                {result.status === 'success' && (
                  <Check className="w-4 h-4 text-green-400 mt-0.5" />
                )}
                {result.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{result.name}</div>
                  <div className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap">
                    {result.message}
                  </div>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                        Show Details
                      </summary>
                      <pre className="text-xs text-zinc-400 mt-2 bg-zinc-950 p-2 rounded overflow-auto">
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
