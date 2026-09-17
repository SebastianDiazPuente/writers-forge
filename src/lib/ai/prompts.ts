import { Entity, EntityMilestone, Scene, Chapter, MilestoneCategory } from '@/types';

/**
 * Builds chronological timeline order for scenes across chapters.
 * Returns a map of sceneId -> globalOrderIndex (0, 1, 2...).
 */
export function buildSceneChronology(
  chapters: Chapter[],
  scenes: Scene[]
): Map<string, number> {
  const sortedChapters = [...chapters].sort((a, b) => a.order_index - b.order_index);
  const chapterOrderMap = new Map<string, number>();
  sortedChapters.forEach((ch, idx) => chapterOrderMap.set(ch.id, idx));

  const sortedScenes = [...scenes].sort((a, b) => {
    const chOrderA = chapterOrderMap.get(a.chapter_id) ?? 0;
    const chOrderB = chapterOrderMap.get(b.chapter_id) ?? 0;
    if (chOrderA !== chOrderB) return chOrderA - chOrderB;
    return a.order_index - b.order_index;
  });

  const chronologyMap = new Map<string, number>();
  sortedScenes.forEach((sc, index) => {
    chronologyMap.set(sc.id, index);
  });

  return chronologyMap;
}

/**
 * REGLA DE RECORTE TEMPORAL (TIME-TRAVEL CONTEXT):
 * Al evaluar la escena N, el contexto del Lore y de las tarjetas enviado a la IA
 * se recorta estrictamente a los eventos registrados hasta la escena N.
 * Se descarta cualquier hito de las escenas N+1 en adelante para evitar spoilers o contaminación futura.
 */
export function filterMilestonesByTimeTravel(
  milestones: EntityMilestone[],
  currentSceneId: string,
  chapters: Chapter[],
  scenes: Scene[],
  activeCategories?: MilestoneCategory[]
): {
  allowedMilestones: EntityMilestone[];
  excludedCount: number;
  currentSceneOrder: number;
} {
  const chronology = buildSceneChronology(chapters, scenes);
  const currentSceneOrder = chronology.get(currentSceneId) ?? Infinity;

  const allowedMilestones: EntityMilestone[] = [];
  let excludedCount = 0;

  for (const m of milestones) {
    // Filter by active categories if specified
    if (activeCategories && activeCategories.length > 0 && !activeCategories.includes(m.category)) {
      continue;
    }

    // If milestone is tied to a specific scene
    if (m.scene_id) {
      const milestoneSceneOrder = chronology.get(m.scene_id);
      // If this milestone belongs to a future scene (order > currentSceneOrder), exclude it!
      if (milestoneSceneOrder !== undefined && milestoneSceneOrder > currentSceneOrder) {
        excludedCount++;
        continue;
      }
    }

    allowedMilestones.push(m);
  }

  return {
    allowedMilestones,
    excludedCount,
    currentSceneOrder,
  };
}

/**
 * Prepares formatted Lore context for the LLM prompt, respecting Time-Travel.
 */
export function formatLoreForPrompt(
  entities: Entity[],
  allowedMilestones: EntityMilestone[]
): string {
  if (entities.length === 0) return 'No hay entidades registradas en el Lore aún.';

  const milestoneMap = new Map<string, EntityMilestone[]>();
  allowedMilestones.forEach(m => {
    const list = milestoneMap.get(m.entity_id) || [];
    list.push(m);
    milestoneMap.set(m.entity_id, list);
  });

  return entities.map(e => {
    const entityMilestones = milestoneMap.get(e.id) || [];
    const milestoneLines = entityMilestones.length > 0
      ? entityMilestones.map(m => `  * [${m.category.toUpperCase()}]: ${m.description}`).join('\n')
      : '  * Sin hitos cronológicos previos.';

    return `### [${e.type.toUpperCase()}] ${e.name}
- Alias conocidos: ${e.aliases && e.aliases.length > 0 ? e.aliases.join(', ') : 'Ninguno'}
- Rol: ${e.role || 'No especificado'}
- Apariencia: ${e.appearance || 'No especificada'}
- Personalidad/Origen: ${e.personality || e.age_origin || 'No especificada'}
- Trasfondo: ${e.background || 'No especificado'}
- HISTORIAL CRONOLÓGICO VÁLIDO HASTA ESTE MOMENTO:
${milestoneLines}`;
  }).join('\n\n');
}

/**
 * Prompt for Narrative Coherence Verification
 */
export function buildCoherencePrompt(
  sceneTitle: string,
  sceneContent: string,
  loreContext: string,
  activeCategories: MilestoneCategory[]
): string {
  return `Eres el Auditor de Coherencia Narrativa y Continuidad Literaria para un escritor profesional.

Tu misión es analizar la escena actual y compararla ESTRICTAMENTE con el Lore cronológico permitido hasta este momento de la historia.

FILTROS ACTIVOS DE VERIFICACIÓN:
${activeCategories.map(c => `- ${c.toUpperCase()}`).join('\n')}

LORE Y VERDADES CANÓNICAS DEL UNIVERSO (RECORTE TEMPORAL HASTA ESTA ESCENA):
${loreContext}

---
ESCENA A EVALUAR:
Título: "${sceneTitle}"
Texto de la escena:
"""
${sceneContent}
"""
---

INSTRUCCIONES DE AUDITORÍA:
1. Revisa si hay contradicciones lógicas, espaciales, de posesión de objetos o de relaciones de personajes.
   - Ubicación (ejemplo: un personaje aparece en la escena pero su hito previo lo ubica a días de distancia sin explicación, o está en dos lugares a la vez).
   - Posesión/Objetos (ejemplo: un personaje usa una espada o amuleto que perdió o que aún está guardado en otro sitio).
   - Relaciones (ejemplo: personajes que no se conocen se tratan con excesiva confianza o ignoran enemistades canónicas).
2. Si la escena es coherente o introduce transiciones naturales que no rompen el canon, repórtalo como coherente.
3. Responde ÚNICAMENTE en formato JSON con la siguiente estructura exacta:

{
  "summary": "Breve resumen de coherencia (1-3 frases)",
  "issues": [
    {
      "id": "iss-1",
      "entityName": "Nombre de la entidad involucrada",
      "category": "location | relationship | possession | other",
      "severity": "warning | error",
      "title": "Título corto de la inconsistencia",
      "issue": "Descripción exacta de la contradicción detectada",
      "explanation": "Por qué entra en conflicto con el Lore previo",
      "suggestion": "Sugerencia elegante para corregir la escena o ajustar la transición"
    }
  ]
}`;
}

/**
 * Prompt for Auto Updating Entity States
 */
export function buildStateUpdatePrompt(
  sceneTitle: string,
  sceneContent: string,
  entities: Entity[]
): string {
  const entityList = entities.map(e => `- ${e.name} (Tipo: ${e.type}, Alias: ${e.aliases.join(', ') || 'ninguno'})`).join('\n');

  return `Eres un Asistente de Extracción de Estados y Continuidad Literaria.

Analiza la siguiente escena y detecta si ocurren NUEVOS HITOS SIGNIFICATIVOS o cambios de estado para las entidades conocidas del libro.

ENTIDADES REGISTRADAS:
${entityList}

ESCENA ACTUAL:
Título: "${sceneTitle}"
Texto:
"""
${sceneContent}
"""

INSTRUCCIONES:
- Extrae únicamente cambios reales y permanentes ocurridos en esta escena (ejemplo: cambio de ubicación física, heridas graves, adquisición o pérdida de objetos clave, cambios drásticos en alianzas o relaciones).
- No inventes información fuera del texto.
- Devuelve la respuesta ÚNICAMENTE en formato JSON:

{
  "updates": [
    {
      "id": "upd-1",
      "entityName": "Nombre exacto de la entidad de la lista",
      "category": "location | relationship | possession | other",
      "description": "Descripción clara, concisa y en tercera persona del hito ocurrido en esta escena",
      "confidence": 0.95
    }
  ]
}`;
}

/**
 * Prompt for Suggesting Lore Details
 */
export function buildLoreSuggestionPrompt(
  entity: Partial<Entity>,
  projectSynopsis?: string,
  projectGenre?: string
): string {
  return `Eres un Consultor Creativo de Worldbuilding y Desarrollo de Personajes para novelas.

DATOS DEL PROYECTO:
- Género: ${projectGenre || 'Fantasía / Ficción literaria'}
- Sinopsis: ${projectSynopsis || 'No especificada'}

FICHA ACTUAL DE LA ENTIDAD (TIPO: ${entity.type}):
- Nombre: ${entity.name || 'Sin nombre'}
- Rol: ${entity.role || 'No especificado'}
- Edad / Origen: ${entity.age_origin || 'No especificado'}
- Apariencia actual: ${entity.appearance || 'Incompleta'}
- Personalidad actual: ${entity.personality || 'Incompleta'}
- Trasfondo actual: ${entity.background || 'Incompleto'}

TAREA:
Desarrolla y enriquece de manera cohesiva y sugerente los campos incompletos para esta entidad. Mantén un tono literario evocador.
Responde ÚNICAMENTE en formato JSON:

{
  "appearance": "Descripción visual detallada y con rasgos distintivos",
  "personality": "Rasgos psicológicos, motivaciones, miedos y contradicciones internas",
  "background": "Historia de fondo que encaja con el mundo",
  "role": "Sugerencia de rol dramático si faltaba",
  "suggested_tags": ["etiqueta1", "etiqueta2", "etiqueta3"]
}`;
}

/**
 * Prompt for Scene Writing Polishing and Tone Adaptation
 */
export function buildPolishingPrompt(
  sceneTitle: string,
  sceneContent: string,
  toneInstruction?: string
): string {
  const defaultInstruction = 'Mejorar fluidez, corrección gramatical y expresividad literaria sin cambiar la trama ni los eventos esenciales.';
  const instruction = toneInstruction && toneInstruction.trim() ? toneInstruction.trim() : defaultInstruction;

  return `Eres un editor y estilista literario de élite.
Tu cometido es reescribir y pulir la redacción de la siguiente escena respetando escrupulosamente los personajes, el desarrollo argumental y los hechos que ocurren.

OBJETIVO Y DIRECTRICES DE ESTILO/TONO:
"${instruction}"

ESCENA A PULIR:
Título: "${sceneTitle}"
Texto original:
"""
${sceneContent}
"""

NORMAS ESTRICTAS DE RESPUESTA:
1. Aplica un estilo literario profesional, rico en matices sensoriales, con ritmo narrativo envolvente y sin redundancias.
2. No introduzcas personajes nuevos ni alteres la trama ni el desenlace de la escena.
3. Devuelve EXCLUSIVAMENTE el texto pulido de la escena. No agregues prefacios, ni explicaciones, ni notas finales ni comillas de bloque.`;
}
