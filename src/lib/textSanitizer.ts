const MOJIBAKE_CHAR_REGEX = /[\u00c3\u00c2\u00e2\u00c5\u00c4\u00fffd]/;

function decodeLatin1AsUtf8(value: string): string {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
        bytes[i] = value.charCodeAt(i) & 0xff;
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function scoreTextQuality(value: string): number {
    const mojibakeHits = (value.match(/[\u00c3\u00c2\u00e2\u00c5\u00c4\u00fffd]/g) || []).length;
    const replacementHits = (value.match(/ďż˝/g) || []).length;
    const polishHits = (value.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g) || []).length;
    return (polishHits * 3) - (mojibakeHits * 2) - (replacementHits * 4);
}

export function repairMojibakeText(input: string | null | undefined): string {
    const source = String(input || '');
    if (!source) return '';

    const looksCorrupted = MOJIBAKE_CHAR_REGEX.test(source) || source.includes('ďż˝');
    if (!looksCorrupted) return source;

    let best = source;
    let bestScore = scoreTextQuality(source);

    // Some strings are double-mangled, try two recovery passes max.
    for (let i = 0; i < 2; i += 1) {
        try {
            const candidate = decodeLatin1AsUtf8(best);
            const candidateScore = scoreTextQuality(candidate);
            if (candidateScore > bestScore) {
                best = candidate;
                bestScore = candidateScore;
            } else {
                break;
            }
        } catch {
            break;
        }
    }

    return best;
}

