import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as shodan } from '@/app/api/osint/shodan/route';
import { GET as sweep } from '@/app/api/osint/sweep/route';
import { GET as scanner } from '@/app/api/scanner/route';
import { GET as crypto } from '@/app/api/crypto/route';
import { GET as chain } from '@/app/api/chain/daily/route';
import { GET as entity } from '@/app/api/entity/expand/route';
import { POST as mcp } from '@/app/api/mcp/route';
import { GET as oi } from '@/app/api/oi/route';
import { GET as username } from '@/app/api/osint/username/route';
import { GET as hudson } from '@/app/api/osint/hudsonrock/route';

afterEach(() => vi.unstubAllGlobals());

describe('banned routes make no outbound call', () => {
  it('rejects each handler before fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const calls = [
      shodan(new Request('http://127.0.0.1/api/osint/shodan?ip=1.1.1.1')),
      sweep(new Request('http://127.0.0.1/api/osint/sweep?ip=1.1.1.1')),
      scanner(new Request('http://127.0.0.1/api/scanner?target=example.com&type=vuln')),
      crypto(),
      chain(new Request('http://127.0.0.1/api/chain/daily')),
      entity(new Request('http://127.0.0.1/api/entity/expand?type=ip&id=1.1.1.1')),
      mcp(new Request('http://127.0.0.1/api/mcp', { method: 'POST', body: '{}' })),
      oi(new Request('http://127.0.0.1/api/oi')),
      username(new Request('http://127.0.0.1/api/osint/username?username=example')),
      hudson(new Request('http://127.0.0.1/api/osint/hudsonrock?query=example.com')),
    ];
    const responses = await Promise.all(calls);
    for (const response of responses) expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
