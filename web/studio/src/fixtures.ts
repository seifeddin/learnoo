// The existing unreviewed technical fixtures, imported verbatim from the Go
// renderer so the Studio and the reader can never drift apart.
import bidi from '../../../internal/rendering/fixtures/bidi.json?raw';
import complexNumbers from '../../../internal/rendering/fixtures/complex-numbers.json?raw';
import failure from '../../../internal/rendering/fixtures/failure.json?raw';

export const FIXTURES = [
  { id: 'complex-numbers', label: 'Nombres complexes (non relu)', route: '/lesson', source: complexNumbers },
  { id: 'bidi', label: 'Test arabe/français (RTL)', route: '/bidi', source: bidi },
  { id: 'failure', label: 'Formule invalide (test d’échec)', route: '/failure', source: failure },
] as const;
