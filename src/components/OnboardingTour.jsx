import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './OnboardingTour.css';
import { crearEfectos } from './onboardingTourEfectos';

/* ------------------------------------------------------------------ */
/*  Configuración                                                      */
/* ------------------------------------------------------------------ */

const TOUR_EVENT = 'evora:reiniciar-tour';

// true  = respeta "reducir movimiento" del sistema (versión suave, sin 3D ni confeti).
// false = muestra siempre todas las animaciones (el usuario puede reducirlas
//         con el enlace "Reducir animaciones" de la tarjeta).
const RESPETAR_MOVIMIENTO_REDUCIDO = false;

// Contenedor de página que hace el "movimiento de cámara" entre rutas.
// Si el elemento resaltado está DENTRO de este contenedor, el efecto se omite
// para no desplazarlo.
const CONTENEDOR_CAMARA = 'main, [role="main"]';

const POPOVER = '.driver-popover.evora-tour-premium';
const MS_SALIDA = 320; // fase 1: la tarjeta actual sale
const MS_ENTRADA = 700; // fase 4: la tarjeta nueva termina de entrar
const MS_APERTURA = 1100;

// Evita que el tour AUTOMÁTICO se repita dentro de la misma sesión
// (por ejemplo, si el componente se vuelve a montar). No usa almacenamiento.
let autoMostrado = false;

// Preferencia del usuario "Reducir animaciones" (dura mientras la pestaña siga abierta).
let reducirManual = false;

const icono = (path) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONOS = {
  hoy: icono('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>'),
  crear: icono('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  detalle: icono('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
  progreso: icono('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')
};

const PASOS = [
  {
    ruta: '/hoy',
    selector: '#nav-hoy',
    icono: ICONOS.hoy,
    titulo: '¡Bienvenido a Evora!',
    descripcion:
      'Aquí ves tus actividades del día y accedes rápido a las funciones principales de tu planificador.',
    consejo: 'Vuelve a esta sección cada mañana para empezar tu día.',
    side: 'right',
    align: 'start'
  },
  {
    ruta: '/crear',
    selector: '#nav-crear',
    icono: ICONOS.crear,
    titulo: 'Organiza tus actividades',
    descripcion:
      'Crea eventos para planificar lo que viene. Completa el formulario y guarda tu evento.',
    consejo: 'Cuanto más completo el formulario, mejor seguimiento tendrás.',
    side: 'right',
    align: 'start'
  },
  {
    ruta: '/detalle-evento',
    selector: '#nav-detalle',
    icono: ICONOS.detalle,
    titulo: 'Consulta el detalle de tus eventos',
    descripcion:
      'Revisa toda la información de un evento. Para ver uno en particular, selecciónalo desde la aplicación.',
    consejo: 'Elige un evento de tu lista para ver sus datos aquí.',
    side: 'right',
    align: 'start'
  },
  {
    ruta: '/progreso',
    selector: '#nav-progreso',
    icono: ICONOS.progreso,
    titulo: 'Sigue tu progreso',
    descripcion:
      'Mira el avance de tus eventos y haz seguimiento a tus actividades.',
    consejo: 'Puedes repetir este recorrido cuando quieras desde la ayuda.',
    side: 'right',
    align: 'start'
  }
];

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

const esperar = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const esVisible = (el) => {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const estilo = getComputedStyle(el);
  return estilo.visibility !== 'hidden' && estilo.display !== 'none';
};

const buscarVisible = (selector) =>
  Array.from(document.querySelectorAll(selector)).find(esVisible) ?? null;

const botonMenu = () => document.querySelector('button[aria-controls="menu-principal"]');

// Devuelve true si el tour abrió el menú (para cerrarlo luego).
const abrirMenu = () => {
  const boton = botonMenu();
  if (boton && esVisible(boton) && boton.getAttribute('aria-expanded') !== 'true') {
    boton.click();
    return true;
  }
  return false;
};

const cerrarMenu = () => {
  const boton = botonMenu();
  if (boton && esVisible(boton) && boton.getAttribute('aria-expanded') === 'true') {
    boton.click();
  }
};

// Sondea hasta que el elemento sea visible. Siempre termina (timeout) y se
// cancela si la operación deja de ser vigente.
const esperarElemento = async (selector, { vigente, alFaltar, timeout = 8000 }) => {
  const inicio = performance.now();
  let intentado = false;

  while (performance.now() - inicio < timeout) {
    if (!vigente()) return null;

    const el = buscarVisible(selector);
    if (el) return el;

    if (!intentado && performance.now() - inicio > 250) {
      intentado = true;
      alFaltar?.();
    }
    await esperar(60);
  }
  return buscarVisible(selector);
};

// Espera a que el elemento deje de moverse (menús que se deslizan, etc.).
const esperarEstable = (el, vigente, max = 1000) =>
  new Promise((resolve) => {
    const inicio = performance.now();
    let previo = '';
    let iguales = 0;

    // Respaldo: rAF se pausa en pestañas en segundo plano.
    window.setTimeout(resolve, max + 200);

    const paso = () => {
      if (!vigente() || !el.isConnected || performance.now() - inicio > max) {
        resolve();
        return;
      }
      const r = el.getBoundingClientRect();
      const clave = [r.left, r.top, r.width, r.height].map((n) => n.toFixed(1)).join('|');
      iguales = clave === previo ? iguales + 1 : 0;
      previo = clave;

      if (iguales >= 3) {
        resolve();
        return;
      }
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });

/* ------------------------------------------------------------------ */
/*  Construcción de la tarjeta (DOM de Driver.js)                      */
/* ------------------------------------------------------------------ */

const crear = (etiqueta, clase, html) => {
  const nodo = document.createElement(etiqueta);
  nodo.className = clase;
  if (html !== undefined) nodo.innerHTML = html;
  return nodo;
};

const activarRipple = (boton) => {
  if (!boton) return;
  boton.addEventListener('pointerdown', (evento) => {
    const r = boton.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 1.6;
    const onda = crear('span', 'evora-ripple');
    onda.style.width = `${d}px`;
    onda.style.height = `${d}px`;
    onda.style.left = `${evento.clientX - r.left - d / 2}px`;
    onda.style.top = `${evento.clientY - r.top - d / 2}px`;
    onda.addEventListener('animationend', () => onda.remove());
    boton.appendChild(onda);
  });
};

const activarInclinacion = (escena, carta) => {
  const reposo = () => {
    ['--evora-rx', '--evora-ry', '--evora-sx'].forEach((v) => carta.style.removeProperty(v));
  };
  escena.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse') return;
    const r = escena.getBoundingClientRect();
    const px = (evento.clientX - r.left) / r.width - 0.5;
    const py = (evento.clientY - r.top) / r.height - 0.5;
    carta.style.setProperty('--evora-rx', `${(-py * 6).toFixed(2)}deg`);
    carta.style.setProperty('--evora-ry', `${(px * 8).toFixed(2)}deg`);
    carta.style.setProperty('--evora-sx', `${(-px * 18).toFixed(1)}px`);
  });
  escena.addEventListener('pointerleave', reposo);
};

/**
 * Reorganiza el popover de Driver.js en:
 *   wrapper (lo posiciona Driver.js; NUNCA se le aplica transform)
 *     ├─ arrow
 *     └─ .evora-escena  ← aquí van las animaciones 3D
 *          └─ .evora-carta (barra, brillo, cabecera, icono, textos, botones)
 *
 * Así las animaciones no interfieren con las mediciones de posición de Driver.js.
 * Devuelve false si el popover ya estaba construido.
 */
const construirTarjeta = (
  popover,
  { indice, previo, direccion, animar, alOmitir, reducidoManual, alAlternarMovimiento }
) => {
  const wrapper = popover.wrapper;
  if (wrapper.querySelector(':scope > .evora-escena')) return false;

  const paso = PASOS[indice];
  const total = PASOS.length;

  const carta = crear('div', 'evora-carta');
  const escena = crear('div', 'evora-escena');

  Array.from(wrapper.children).forEach((hijo) => {
    if (hijo !== popover.arrow) carta.appendChild(hijo);
  });
  escena.appendChild(carta);
  wrapper.appendChild(escena);

  // Barra superior + brillo
  const barra = crear('div', 'evora-barra', '<i></i>');
  const brillo = crear('div', 'evora-brillo');
  carta.prepend(barra, brillo);

  // Cabecera: contador 01 / 04 + segmentos
  const cabecera = crear('div', 'evora-cabecera');
  const contador = crear(
    'span',
    'evora-contador',
    `<b>${String(indice + 1).padStart(2, '0')}</b><span> / ${String(total).padStart(2, '0')}</span>`
  );
  const segmentos = crear('div', 'evora-segmentos');
  segmentos.setAttribute('role', 'img');
  segmentos.setAttribute('aria-label', `Paso ${indice + 1} de ${total}`);
  const piezas = PASOS.map(() => segmentos.appendChild(document.createElement('i')));
  cabecera.append(contador, segmentos);

  // Se aplica primero el estado anterior y luego el actual: la transición CSS
  // anima el avance aunque Driver.js recree el popover en cada paso.
  const aplicarProgreso = (actual) => {
    piezas.forEach((pieza, i) => {
      pieza.className = i < actual ? 'hecho' : i === actual ? 'activo' : '';
    });
    barra.firstElementChild.style.setProperty('--p', String((actual + 1) / total));
  };
  aplicarProgreso(previo);

  const insignia = crear('div', 'evora-icono', paso.icono);
  popover.title.before(cabecera, insignia);

  if (paso.consejo) {
    const consejo = crear('p', 'evora-consejo');
    consejo.textContent = paso.consejo;
    popover.description.after(consejo);
  }

  if (indice < total - 1) {
    const omitir = crear('button', 'evora-omitir');
    omitir.type = 'button';
    omitir.textContent = 'Omitir recorrido';
    omitir.addEventListener('click', alOmitir);
    popover.footer.prepend(omitir);
  }

  activarRipple(popover.nextButton);
  activarRipple(popover.previousButton);

  if (animar && window.matchMedia?.('(hover: hover)').matches) {
    activarInclinacion(escena, carta);
  }

  // Enlace para reducir / reactivar las animaciones.
  if (alAlternarMovimiento) {
    const reducir = crear('button', 'evora-reducir');
    reducir.type = 'button';
    reducir.textContent = reducidoManual ? 'Activar animaciones' : 'Reducir animaciones';
    reducir.addEventListener('click', () => {
      const ahora = alAlternarMovimiento();
      reducir.textContent = ahora ? 'Activar animaciones' : 'Reducir animaciones';
    });
    carta.appendChild(reducir);
  }

  // La animación arranca un fotograma después de que Driver.js posicione la tarjeta.
  wrapper.dataset.direccion = direccion;
  wrapper.classList.add('evora-oculto');
  requestAnimationFrame(() => {
    wrapper.classList.remove('evora-oculto');
    void wrapper.offsetWidth;
    wrapper.classList.add('evora-entra');
    aplicarProgreso(indice);
    popover.nextButton?.focus?.({ preventScroll: true });
  });

  return true;
};

/* ------------------------------------------------------------------ */
/*  API pública                                                        */
/* ------------------------------------------------------------------ */

// Lanza el tour cuando quieras (p. ej. desde un botón de ayuda).
// <OnboardingTour /> debe estar montado en el layout principal.
export const reiniciarTour = () => {
  window.dispatchEvent(new Event(TOUR_EVENT));
};

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */

/**
 * Props:
 *   cuentaNueva  boolean  true → el tour sale solo (cuenta recién creada).
 *   onTerminar   (motivo: 'completado' | 'omitido') => void
 *                Úsalo para marcar en tu backend/estado que el tour ya se vio,
 *                de modo que cuentaNueva deje de ser true.
 */
export default function OnboardingTour({ cuentaNueva = false, onTerminar }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateRef = useRef(navigate);
  const rutaRef = useRef(location.pathname);
  const onTerminarRef = useRef(onTerminar);

  const driverRef = useRef(null);
  const fxRef = useRef(null);
  const montadoRef = useRef(false);
  const operacionRef = useRef(0); // invalida transiciones en curso
  const pasoRef = useRef(0);
  const progresoPrevRef = useRef(-1);
  const direccionRef = useRef('inicio'); // 'inicio' | 'adelante' | 'atras'
  const ocupadoRef = useRef(false); // evita navegaciones simultáneas
  const cerrandoRef = useRef(false);
  const menuAbiertoRef = useRef(false);
  const temporizadoresRef = useRef(new Set());
  const accionesRef = useRef({});

  navigateRef.current = navigate;
  onTerminarRef.current = onTerminar;

  // La ruta se sincroniza tras el commit de React (DOM ya actualizado).
  useEffect(() => {
    rutaRef.current = location.pathname;
  }, [location.pathname]);

  const programar = useCallback((fn, ms) => {
    const id = window.setTimeout(() => {
      temporizadoresRef.current.delete(id);
      fn();
    }, ms);
    temporizadoresRef.current.add(id);
  }, []);

  /* ---- Cámara de página (escala + desenfoque) ---- */
  const camara = useCallback(
    (fase, objetivo) => {
      const contenedor = document.querySelector(CONTENEDOR_CAMARA);
      if (!contenedor || fxRef.current?.reducido()) return;
      if (objetivo && contenedor.contains(objetivo)) return; // no mover el elemento resaltado

      contenedor.setAttribute('data-evora-camara', fase);
      if (fase !== 'salida') {
        programar(() => {
          if (contenedor.getAttribute('data-evora-camara') === fase) {
            contenedor.removeAttribute('data-evora-camara');
          }
        }, 1100);
      }
    },
    [programar]
  );

  const limpiarVisual = useCallback(() => {
    document.body.classList.remove('evora-tour-ocupado');
    document
      .querySelectorAll('[data-evora-camara]')
      .forEach((n) => n.removeAttribute('data-evora-camara'));
    fxRef.current?.ocultarMira();
  }, []);

  const restaurarMenu = useCallback(() => {
    if (menuAbiertoRef.current) {
      menuAbiertoRef.current = false;
      cerrarMenu();
    }
  }, []);

  /* ---- Cerrar (omitir / completar) ---- */
  const cerrar = useCallback(
    (motivo) => {
      const instancia = driverRef.current;
      if (!instancia || cerrandoRef.current) return;

      cerrandoRef.current = true;
      operacionRef.current += 1; // cancela cualquier transición en curso

      const rect = document.querySelector(POPOVER)?.getBoundingClientRect();
      driverRef.current = null;
      ocupadoRef.current = false;

      try {
        instancia.destroy(); // destroy() público no vuelve a disparar onDestroyStarted
      } catch (error) {
        console.error('Tour Evora: error al cerrar.', error);
      }

      limpiarVisual();
      restaurarMenu();

      // Avisa a la app: ahí marcas el tour como visto (backend o estado).
      try {
        onTerminarRef.current?.(motivo);
      } catch (error) {
        console.error('Tour Evora: error en onTerminar.', error);
      }

      // Celebración SOLO al completar, nunca al omitir.
      if (motivo === 'completado') fxRef.current?.celebrar(rect);

      cerrandoRef.current = false;
    },
    [limpiarVisual, restaurarMenu]
  );

  /* ---- Cerrar sin avisar (reinicio / desmontaje) ---- */
  const descartar = useCallback(() => {
    operacionRef.current += 1;
    ocupadoRef.current = false;

    const instancia = driverRef.current;
    driverRef.current = null;
    try {
      instancia?.destroy();
    } catch {
      /* noop */
    }
    limpiarVisual();
    restaurarMenu();
  }, [limpiarVisual, restaurarMenu]);

  const esperarRuta = useCallback(async (ruta, vigente) => {
    if (rutaRef.current !== ruta) navigateRef.current(ruta);

    const inicio = performance.now();
    while (performance.now() - inicio < 4000) {
      if (!vigente()) return false;
      if (rutaRef.current === ruta) {
        await esperar(160); // deja que React pinte la ruta
        return vigente();
      }
      await esperar(50);
    }
    // No bloquear el tour: la barra de navegación suele existir en cualquier ruta.
    console.warn(
      `Tour Evora: la ruta ${ruta} no se activó a tiempo; se continúa en ${rutaRef.current}.`
    );
    return vigente();
  }, []);

  /* ---- Cambio de paso con fases sincronizadas ---- */
  const irAPaso = useCallback(
    async (indice) => {
      const paso = PASOS[indice];
      const instancia = driverRef.current;
      if (!paso || !instancia || ocupadoRef.current) return;

      const operacion = operacionRef.current;
      const vigente = () =>
        montadoRef.current &&
        operacionRef.current === operacion &&
        driverRef.current === instancia;

      const fx = fxRef.current;
      const animar = !fx?.reducido();
      const adelante = indice > pasoRef.current;

      ocupadoRef.current = true;
      document.body.classList.add('evora-tour-ocupado');

      try {
        // Fase 1 · sale la tarjeta actual y se desactiva el visor
        const tarjeta = document.querySelector(POPOVER);
        if (tarjeta) {
          tarjeta.dataset.salida = adelante ? 'adelante' : 'atras';
          tarjeta.classList.remove('evora-entra');
          tarjeta.classList.add('evora-sale');
        }
        fx?.ocultarMira();
        if (animar) await esperar(MS_SALIDA);
        if (!vigente()) return;

        // Fase 2 · la página se aleja y se navega con React Router
        camara('salida', document.querySelector(paso.selector));
        if (!(await esperarRuta(paso.ruta, vigente))) return;

        // Fase 3 · esperar elemento visible y estable (menú móvil incluido)
        const elemento = await esperarElemento(paso.selector, {
          vigente,
          alFaltar: () => {
            if (abrirMenu()) menuAbiertoRef.current = true;
          }
        });
        if (!vigente()) return;

        if (elemento) {
          await esperarEstable(elemento, vigente);
        } else {
          console.warn(`Tour Evora: ${paso.selector} no apareció; se muestra el paso centrado.`);
        }
        if (!vigente()) return;

        // Fase 4 · llega la página, se enfoca el visor y entra la tarjeta nueva
        camara('entrada', elemento);
        direccionRef.current = adelante ? 'adelante' : 'atras';
        pasoRef.current = indice;
        instancia.moveTo(indice);

        if (animar) await esperar(MS_ENTRADA);
      } catch (error) {
        console.error('Tour Evora: error durante la transición.', error);
        if (vigente()) {
          try {
            instancia.moveTo(pasoRef.current); // la tarjeta nunca queda oculta o bloqueada
          } catch {
            /* noop */
          }
        }
      } finally {
        ocupadoRef.current = false;
        document.body.classList.remove('evora-tour-ocupado');
      }
    },
    [camara, esperarRuta]
  );

  /* ---- Inicio ---- */
  // forzar = true  → lo pidió el usuario con el botón (siempre se muestra).
  // forzar = false → arranque automático de cuenta nueva (una vez por sesión).
  const iniciar = useCallback(
    async ({ forzar = false } = {}) => {
      if (!montadoRef.current || driverRef.current) return;
      if (!forzar && autoMostrado) return;

      const operacion = ++operacionRef.current;
      const vigente = () => montadoRef.current && operacionRef.current === operacion;
      const fx = fxRef.current;

      try {
        if (!(await esperarRuta(PASOS[0].ruta, vigente))) return;

        const primero = await esperarElemento(PASOS[0].selector, {
          vigente,
          alFaltar: () => {
            if (abrirMenu()) menuAbiertoRef.current = true;
          }
        });
        if (!vigente()) return;

        if (!primero) {
          console.error('Tour Evora: no se encontró #nav-hoy.', {
            rutaActual: rutaRef.current,
            menu: botonMenu() ? 'Botón de menú encontrado' : 'Sin botón de menú'
          });
          return;
        }

        await esperarEstable(primero, vigente);
        if (!vigente()) return;

        const reducido = fx?.reducido() ?? false;
        const total = PASOS.length;

        // El iris de apertura nace en el centro del primer elemento.
        const r = primero.getBoundingClientRect();
        const raiz = document.documentElement.style;
        raiz.setProperty('--evora-cx', `${r.left + r.width / 2}px`);
        raiz.setProperty('--evora-cy', `${r.top + r.height / 2}px`);

        progresoPrevRef.current = -1;
        direccionRef.current = 'inicio';
        pasoRef.current = 0;

        camara('apertura', primero);
        fx?.destelloEn(primero);

        const instancia = driver({
          animate: !reducido,
          smoothScroll: !reducido,
          showProgress: false,
          showButtons: ['previous', 'next', 'close'],
          allowClose: true,
          allowKeyboardControl: true,
          overlayColor: '#031018',
          overlayOpacity: 0.78,
          stagePadding: 10,
          stageRadius: 14,
          popoverOffset: 18,
          popoverClass: 'evora-tour-premium',
          nextBtnText: 'Siguiente',
          prevBtnText: 'Atrás',
          doneBtnText: 'Empezar a usar Evora',

          steps: PASOS.map((p) => ({
            // Función: siempre el elemento VISIBLE (evita duplicados móvil/escritorio).
            element: () => buscarVisible(p.selector) ?? document.querySelector(p.selector),
            popover: {
              title: p.titulo,
              description: p.descripcion,
              side: p.side,
              align: p.align
            }
          })),

          onHighlightStarted: (elemento, _paso, { state }) => {
            const indice = state?.activeIndex ?? pasoRef.current;
            pasoRef.current = indice;
            fxRef.current?.apuntar(elemento, () => buscarVisible(PASOS[indice].selector));
          },

          onPopoverRender: (popover, { state }) => {
            const indice = state?.activeIndex ?? pasoRef.current;
            if (!PASOS[indice]) return;

            const construido = construirTarjeta(popover, {
              indice,
              previo: progresoPrevRef.current,
              direccion: direccionRef.current,
              animar: !fxRef.current?.reducido(),
              alOmitir: () => accionesRef.current.cerrar('omitido'),
              reducidoManual: reducirManual,
              alAlternarMovimiento: () => accionesRef.current.alternarMovimiento()
            });

            if (construido) progresoPrevRef.current = indice;
          },

          // En el último paso, "Siguiente" es el botón de finalizar: como definimos
          // onNextClick, Driver.js ya no cierra por su cuenta, así que lo hacemos aquí.
          onNextClick: () => {
            const siguiente = pasoRef.current + 1;
            if (siguiente >= total) accionesRef.current.cerrar('completado');
            else accionesRef.current.irAPaso(siguiente);
          },

          onPrevClick: () => {
            const anterior = pasoRef.current - 1;
            if (anterior >= 0) accionesRef.current.irAPaso(anterior);
          },

          // Esc, clic en el fondo o botón X: se considera "omitido".
          onDestroyStarted: () => accionesRef.current.cerrar('omitido'),

          // Red de seguridad si Driver.js se destruye por otra vía.
          onDestroyed: () => {
            if (driverRef.current === instancia) {
              driverRef.current = null;
              limpiarVisual();
              restaurarMenu();
            }
          }
        });

        driverRef.current = instancia;

        // Bloqueo breve durante la apertura para evitar clics durante el iris.
        ocupadoRef.current = true;
        document.body.classList.add('evora-tour-ocupado');
        programar(
          () => {
            ocupadoRef.current = false;
            document.body.classList.remove('evora-tour-ocupado');
          },
          reducido ? 0 : MS_APERTURA
        );

        // Se marca justo antes de arrancar: así StrictMode (doble montaje)
        // no cancela el primer intento sin haber mostrado nada.
        autoMostrado = true;
        instancia.drive(0);
      } catch (error) {
        console.error('Error al iniciar el tour de Evora:', error);
        descartar();
      }
    },
    [camara, descartar, esperarRuta, limpiarVisual, programar, restaurarMenu]
  );

  /* ---- Reducir / reactivar animaciones (enlace de la tarjeta) ---- */
  const alternarMovimiento = () => {
    reducirManual = !reducirManual;
    fxRef.current?.forzarReducido(reducirManual);
    document.documentElement.dataset.evoraMovimiento = fxRef.current?.reducido()
      ? 'reducido'
      : 'completo';
    return reducirManual;
  };

  accionesRef.current = { cerrar, irAPaso, iniciar, alternarMovimiento };

  /* ---- Ciclo de vida (compatible con React StrictMode) ---- */
  useEffect(() => {
    montadoRef.current = true;

    const fx = crearEfectos({ respetarMovimientoReducido: RESPETAR_MOVIMIENTO_REDUCIDO });
    fxRef.current = fx;
    fx.forzarReducido(reducirManual);
    document.documentElement.dataset.evoraMovimiento = fx.reducido() ? 'reducido' : 'completo';

    // Botón "Ver recorrido": se puede repetir siempre que se quiera.
    const manejarReinicio = () => {
      descartar();
      programar(() => accionesRef.current.iniciar({ forzar: true }), 200);
    };

    window.addEventListener(TOUR_EVENT, manejarReinicio);

    return () => {
      window.removeEventListener(TOUR_EVENT, manejarReinicio);
      montadoRef.current = false;

      descartar();

      temporizadoresRef.current.forEach((id) => window.clearTimeout(id));
      temporizadoresRef.current.clear();

      fx.limpiar();
      fxRef.current = null;

      delete document.documentElement.dataset.evoraMovimiento;
      document.documentElement.style.removeProperty('--evora-cx');
      document.documentElement.style.removeProperty('--evora-cy');
    };
  }, [descartar, programar]);

  /* ---- Arranque automático: SOLO cuentas recién creadas ---- */
  useEffect(() => {
    if (cuentaNueva) {
      accionesRef.current.iniciar();
    } else {
      // Sin cuenta nueva (sesión cerrada o tour ya visto): se rearma para la próxima.
      autoMostrado = false;
    }
  }, [cuentaNueva]);

  return null;
}