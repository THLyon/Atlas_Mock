import React, { useState } from 'react';

interface ParsedResponse {
  legalAnswer: string;
}

const LegalAssistant = () => {
  const [userQuery, setUserQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery }),
      });

      if (res.status !== 200) {
        const parsedError: { err: string } = await res.json();
        setError(parsedError.err);
      } else {
        const parsedResponse: ParsedResponse = await res.json();
        setResponse(parsedResponse.legalAnswer);
      }
    } catch (_err) {
      setError('Error fetching legal insight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="query">
          Enter your legal question or description of a case:
        </label>
        <input
          id="query"
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="e.g. What are the key rulings on non-compete clauses in California?"
          style={{ width: '100%', padding: '8px', marginTop: '8px' }}
        />
        <button type="submit" style={{ marginTop: '16px' }} disabled={loading}>
          {loading ? 'Retrieving...' : 'Get Legal Insight'}
        </button>
      </form>

      {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
      {response && (
        <div style={{ marginTop: '24px' }}>
          <h2>Legal Insight:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

export default LegalAssistant;
