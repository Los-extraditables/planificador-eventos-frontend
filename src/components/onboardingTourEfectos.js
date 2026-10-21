/**
 * Efectos visuales del tour de Evora que viven FUERA de React:
 * visor holográfico, destellos y celebración final.
 *
 * Todo lo que se añade al DOM se registra aquí y se elimina en limpiar(),
 * así que no quedan nodos, temporizadores ni bucles de animación huérfanos.
 */

const COLORES_CONFETI = ['#22d3ee', '#06b6d4', '#087f98', '#5eead4', '#a5f3fc', '#ffffff', '#fbbf24'];
const azar = (min, max) => min + Math.random() * (max - min);

export const prefiereMovimientoReducido = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function crearEfectos({ respetarMovimientoReducido = true } = {}) {
  let mira = null;
  let raf = 0;
  let objetivo = null;
  let resolver = null;
  let ultimaMedida = '';
  let destruido = false;
  let forzado = false; // el usuario pidió "Reducir animaciones"

  const temporizadores = new Set();
  const nodos = new Set();

  const reducido = () =>
    forzado || (respetarMovimientoReducido && prefiereMovimientoReducido());

  const forzarReducido = (valor) => {
    forzado = Boolean(valor);
  };

  const programar = (fn, ms) => {
    const id = window.setTimeout(() => {
      temporizadores.delete(id);
      if (!destruido) fn();
    }, ms);
    temporizadores.add(id);
    return id;
  };

  const quitarNodo = (nodo) => {
    nodo.remove();
    nodos.delete(nodo);
  };

  const montar = (nodo, vidaMs) => {
    if (destruido) return;
    document.body.appendChild(nodo);
    nodos.add(nodo);
    programar(() => quitarNodo(nodo), vidaMs);
  };

  const crear = (clase, estilos = {}) => {
    const nodo = document.createElement('div');
    nodo.className = clase;
    Object.entries(estilos).forEach(([clave, valor]) => {
      if (clave.startsWith('--')) nodo.style.setProperty(clave, valor);
      else nodo.style[clave] = valor;
    });
    return nodo;
  };

  /* ------------------------- Visor holográfico ------------------------- */

  const crearMira = () => {
    if (mira) return mira;

    mira = crear('evora-mira');
    mira.setAttribute('aria-hidden', 'true');
    mira.innerHTML =
      '<i></i><i></i><i></i><i></i>' +
      '<span class="evora-mira-linea"></span>' +
      '<span class="evora-mira-onda"></span>' +
      '<span class="evora-mira-onda evora-mira-onda--2"></span>';

    // Cuando las esquinas terminan de ensamblarse: destello de enfoque.
    mira.addEventListener('animationend', (evento) => {
      if (evento.target === mira && evento.animationName === 'evora-mira-bloqueo') {
        mira.classList.add('evora-mira--enfocado');
      }
    });

    document.body.appendChild(mira);
    return mira;
  };

  const medir = () => {
    if (!mira) return;

    // Si el elemento se re-renderizó, lo volvemos a buscar.
    if (resolver && (!objetivo || !objetivo.isConnected)) objetivo = resolver();

    const r = objetivo?.getBoundingClientRect();
    const visible = Boolean(r) && r.width > 0 && r.height > 0;
    mira.classList.toggle('evora-mira--oculta', !visible);
    if (!visible) return;

    const clave = [r.left, r.top, r.width, r.height].map((n) => n.toFixed(1)).join('|');
    if (clave === ultimaMedida) return;
    ultimaMedida = clave;

    const margen = 8;
    mira.style.left = `${r.left - margen}px`;
    mira.style.top = `${r.top - margen}px`;
    mira.style.width = `${r.width + margen * 2}px`;
    mira.style.height = `${r.height + margen * 2}px`;
  };

  const seguir = () => {
    raf = requestAnimationFrame(seguir);
    medir();
  };

  const ocultarMira = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    objetivo = null;
    resolver = null;
    ultimaMedida = '';
    if (mira) mira.className = 'evora-mira';
  };

  const apuntar = (elemento, buscarDeNuevo) => {
    if (destruido) return;
    if (!elemento) {
      ocultarMira();
      return;
    }

    objetivo = elemento;
    resolver = buscarDeNuevo ?? null;
    ultimaMedida = '';

    crearMira();
    mira.className = 'evora-mira';
    medir();
    void mira.offsetWidth; // reinicia la animación de ensamblaje
    mira.classList.add('evora-mira--bloqueando');

    if (!raf) raf = requestAnimationFrame(seguir);
  };

  /* ------------------------------ Destellos ----------------------------- */

  const destello = (x, y, tipo = 'normal') => {
    montar(
      crear(`evora-destello${tipo === 'final' ? ' evora-destello--final' : ''}`, {
        left: `${x}px`,
        top: `${y}px`
      }),
      tipo === 'final' ? 1700 : 1100
    );
  };

  const destelloEn = (elemento, tipo) => {
    if (!elemento) return;
    const r = elemento.getBoundingClientRect();
    destello(r.left + r.width / 2, r.top + r.height / 2, tipo);
  };

  /* ---------------------------- Celebración ---------------------------- */

  const celebrar = (rect) => {
    if (destruido) return;

    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    destello(cx, cy, 'final');

    // Si el usuario prefiere menos movimiento: solo el destello suave.
    if (reducido()) return;

    ['', 'evora-onda-final--2'].forEach((extra) => {
      montar(
        crear(`evora-onda-final ${extra}`.trim(), { left: `${cx}px`, top: `${cy}px` }),
        1800
      );
    });

    const caja = crear('evora-confeti');

    // Confeti de distintos tamaños y formas
    for (let i = 0; i < 90; i += 1) {
      const forma = i % 3; // 0 rectángulo, 1 círculo, 2 tira
      const horizontal = crear('evora-confeti-x', {
        left: `${cx}px`,
        top: `${cy}px`,
        '--dx': `${azar(-420, 420)}px`,
        '--t': `${azar(1.6, 2.6)}s`
      });
      const vertical = crear('evora-confeti-y', {
        '--arriba': `${azar(-340, -90)}px`,
        '--abajo': `${azar(180, 560)}px`,
        '--giro': `${azar(360, 1200)}deg`,
        '--w': `${forma === 2 ? azar(3, 5) : azar(6, 11)}px`,
        '--h': `${forma === 2 ? azar(16, 26) : forma === 1 ? azar(6, 11) : azar(9, 16)}px`,
        '--radio': forma === 1 ? '50%' : '2px',
        '--color': COLORES_CONFETI[i % COLORES_CONFETI.length]
      });
      horizontal.appendChild(vertical);
      caja.appendChild(horizontal);
    }

    // Chispas rápidas en explosión radial
    for (let i = 0; i < 40; i += 1) {
      const angulo = (Math.PI * 2 * i) / 40 + azar(-0.1, 0.1);
      const distancia = azar(120, 320);
      caja.appendChild(
        crear('evora-chispa', {
          left: `${cx}px`,
          top: `${cy}px`,
          '--dx': `${Math.cos(angulo) * distancia}px`,
          '--dy': `${Math.sin(angulo) * distancia}px`,
          '--t': `${azar(0.7, 1.3)}s`,
          '--color': COLORES_CONFETI[i % 4]
        })
      );
    }

    montar(caja, 3400);
  };

  /* ------------------------------ Limpieza ------------------------------ */

  const limpiar = () => {
    destruido = true;
    cancelAnimationFrame(raf);
    raf = 0;
    temporizadores.forEach((id) => window.clearTimeout(id));
    temporizadores.clear();
    nodos.forEach((nodo) => nodo.remove());
    nodos.clear();
    mira?.remove();
    mira = null;
    objetivo = null;
    resolver = null;
  };

  return {
    apuntar,
    ocultarMira,
    destello,
    destelloEn,
    celebrar,
    limpiar,
    reducido,
    forzarReducido
  };
}