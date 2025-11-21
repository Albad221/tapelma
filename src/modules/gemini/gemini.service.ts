import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private imageGenAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.imageGenAI = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  /**
   * Determine the appropriate prompt style based on job description
   */
  private determinePromptStyle(description: string): string {
    const desc = description.toLowerCase();

    // Executive/Corporate
    if (desc.match(/ceo|cto|cfo|directeur|director|executive|président|president|c-suite|cadre sup/i)) {
      return 'executive';
    }

    // Legal
    if (desc.match(/avocat|lawyer|juriste|legal|notaire|magistrat/i)) {
      return 'legal';
    }

    // Healthcare
    if (desc.match(/médecin|doctor|infirmier|nurse|dentiste|pharmacien|healthcare|health|medical/i)) {
      return 'healthcare';
    }

    // Therapist/Counselor
    if (desc.match(/thérapeute|therapist|psychologue|psychologist|conseiller|counselor|coach/i)) {
      return 'therapist';
    }

    // Creative/Artist
    if (desc.match(/artiste|artist|designer|créatif|creative|photographe|photographer|illustrateur|illustrator/i)) {
      return 'creative';
    }

    // Content Creator/Influencer
    if (desc.match(/influenceur|influencer|créateur de contenu|content creator|youtuber|blogger/i)) {
      return 'content_creator';
    }

    // Real Estate
    if (desc.match(/immobilier|real estate|agent immobilier|realtor/i)) {
      return 'real_estate';
    }

    // Entrepreneur/Startup
    if (desc.match(/entrepreneur|startup|fondateur|founder|innovateur|innovator/i)) {
      return 'entrepreneur';
    }

    // Trades/Crafts (Menuisier, plombier, etc.)
    if (desc.match(/menuisier|plombier|électricien|carpenter|plumber|electrician|artisan|craftsman|ouvrier|worker|technicien|technician/i)) {
      return 'trades';
    }

    // Default: General professional/job hunter
    return 'general';
  }

  /**
   * Get contextual prompt based on profession type
   */
  private getContextualPrompt(style: string, description: string, language: string): string {
    const prompts = {
      executive: {
        fr: `Transformez cette photo en un portrait professionnel de niveau cadre supérieur/exécutif adapté aux profils LinkedIn C-suite. IMPORTANT: Gardez exactement la même personne, le même visage, la même identité.

Instructions de transformation pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante, épaules carrées face à la caméra.
- L'éclairage doit être dramatique mais professionnel avec des ombres douces
- Portez un blazer bleu marine foncé ou un costume d'affaires élégant
- L'arrière-plan doit être un bureau corporatif moderne avec de grandes baies vitrées, légèrement flouté
- Expression: confiante et professionnelle, regard direct vers la caméra
- Préservez la texture naturelle de la peau tout en améliorant subtilement la netteté

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage), changez l'éclairage, l'arrière-plan et la tenue.`,
        en: `Transform this photo into a crisp, executive-level professional headshot suitable for C-suite LinkedIn profiles. IMPORTANT: Keep exactly the same person, the same face, the same identity.

Transformation instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be dramatic yet professional with soft shadows
- My posture is confident and approachable, shoulders square to camera
- Wearing a dark navy blazer or elegant business suit
- The background is a modern corporate office with floor-to-ceiling windows, slightly blurred
- Expression: confident and professional, eyes making direct contact with camera
- Preserve natural skin texture while subtly enhancing sharpness

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato profesional de nivel ejecutivo nítido, adecuado para perfiles de LinkedIn de alta dirección. IMPORTANTE: Mantén exactamente la misma persona, la misma cara, la misma identidad.

Instrucciones de transformación para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser dramática pero profesional con sombras suaves
- Mi postura es confiada y accesible, hombros cuadrados hacia la cámara
- Vestir un blazer azul marino oscuro o traje de negocios elegante
- El fondo es una oficina corporativa moderna con ventanas de piso a techo, ligeramente desenfocado
- Expresión: confiada y profesional, ojos haciendo contacto directo con la cámara
- Preservar la textura natural de la piel mientras se mejora sutilmente la nitidez

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      legal: {
        fr: `Transformez cette photo en un portrait professionnel autoritaire parfait pour les cabinets d'avocats et répertoires juridiques. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être classique et intemporel avec des ombres contrôlées
- Mon expression doit être sérieuse mais personnelle, épaules carrées face à la caméra
- Portez un costume ou une tenue formelle noire/grise
- L'arrière-plan doit être un bureau traditionnel avec boiseries acajou et livres de droit, élégamment flouté
- Expression: professionnelle et digne de confiance
- Cadrage professionnel (tête et épaules)

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into a sharp, authoritative headshot perfect for law firm partnerships and legal directories. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be classic and timeless with controlled shadows
- My expression is serious yet personable, shoulders square to camera
- Wearing a black/gray formal suit or business attire
- The background is a traditional mahogany-paneled office with law books, elegantly blurred
- Expression: professional and trustworthy
- Professional portrait framing (head and shoulders)

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato profesional autoritario perfecto para bufetes de abogados y directorios legales. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser clásica y atemporal con sombras controladas
- Mi expresión es seria pero cercana, hombros cuadrados hacia la cámara
- Vestir un traje formal negro/gris o vestimenta de negocios
- El fondo es una oficina tradicional con paneles de caoba y libros de derecho, elegantemente desenfocado
- Expresión: profesional y confiable
- Encuadre de retrato profesional (cabeza y hombros)

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      healthcare: {
        fr: `Transformez cette photo en un portrait professionnel de santé digne de confiance pour sites web de cabinets médicaux. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être propre et clinique mais chaleureux et accessible
- Mon expression doit être bienveillante et compétente, transmettant une expertise médicale
- Portez une blouse blanche ou une tenue professionnelle médicale appropriée
- L'arrière-plan doit être un cabinet médical moderne avec du matériel médical subtil, professionnellement flouté
- Expression: rassurante et professionnelle
- Préservez l'authenticité et la chaleur humaine

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into a trustworthy healthcare professional headshot perfect for medical practice websites. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be clean and clinical yet warm and approachable
- My expression is caring and competent, conveying medical expertise
- Wearing a white coat or appropriate professional medical attire
- The background is a modern medical office with subtle medical equipment, professionally blurred
- Expression: reassuring and professional
- Preserve authenticity and human warmth

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato profesional de salud confiable perfecto para sitios web de consultorios médicos. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser limpia y clínica pero cálida y accesible
- Mi expresión es cariñosa y competente, transmitiendo experiencia médica
- Vestir una bata blanca o vestimenta profesional médica apropiada
- El fondo es un consultorio médico moderno con equipo médico sutil, profesionalmente desenfocado
- Expresión: tranquilizadora y profesional
- Preservar la autenticidad y calidez humana

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      therapist: {
        fr: `Transformez cette photo en un portrait de thérapeute qui met immédiatement les clients à l'aise. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être doux et réconfortant avec une chaleur naturelle
- Ma présence doit être calme et empathique, yeux transmettant compréhension et sécurité
- Portez une tenue professionnelle décontractée et accessible (pull, chemise douce)
- L'arrière-plan doit être un bureau de thérapie paisible avec des plantes et des couleurs apaisantes, doucement flouté
- Expression: chaleureuse, empathique et rassurante
- Atmosphère accueillante et sécurisante

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into a therapist's headshot that immediately puts clients at ease. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be soft and comforting with natural warmth
- My presence is calm and empathetic, eyes conveying understanding and safety
- Wearing professional yet approachable casual attire (sweater, soft shirt)
- The background is a peaceful therapy office with plants and calming colors, soothingly blurred
- Expression: warm, empathetic, and reassuring
- Welcoming and safe atmosphere

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato de terapeuta que ponga a los clientes a gusto de inmediato. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser suave y reconfortante con calidez natural
- Mi presencia es calmada y empática, ojos transmitiendo comprensión y seguridad
- Vestir ropa casual profesional y accesible (suéter, camisa suave)
- El fondo es un consultorio de terapia tranquilo con plantas y colores calmantes, suavemente desenfocado
- Expresión: cálida, empática y tranquilizadora
- Atmósfera acogedora y segura

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      creative: {
        fr: `Transformez cette photo en un portrait artistique parfait pour portfolios créatifs et représentations de galeries. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être ambiant et dramatique avec des ombres artistiques
- Mon expression doit être contemplative et inspirée, yeux reflétant la créativité
- Portez une tenue créative et stylée qui reflète votre personnalité artistique
- L'arrière-plan doit être un atelier d'artiste avec toiles et outils créatifs, artistiquement flouté
- Expression: artistique, inspirée et authentique
- Style plus libre et expressif

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into an artistic headshot perfect for creative portfolios and gallery representations. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be moody and dramatic with artistic shadows
- My expression is contemplative and inspired, eyes reflecting creativity
- Wearing creative and stylish attire that reflects your artistic personality
- The background is an art studio with canvases and creative tools, artistically blurred
- Expression: artistic, inspired, and authentic
- More free-flowing and expressive style

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato artístico perfecto para portafolios creativos y representaciones de galerías. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser ambiental y dramática con sombras artísticas
- Mi expresión es contemplativa e inspirada, ojos reflejando creatividad
- Vestir ropa creativa y elegante que refleje tu personalidad artística
- El fondo es un estudio de arte con lienzos y herramientas creativas, artísticamente desenfocado
- Expresión: artística, inspirada y auténtica
- Estilo más libre y expresivo

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      content_creator: {
        fr: `Transformez cette photo en un portrait digne d'un influenceur parfait pour collaborations de marques et propositions de parrainage. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être optimisé pour les réseaux sociaux avec amélioration parfaite de la peau
- Mon vibe doit être tendance et engageante, expression naturellement photogénique
- Portez une tenue moderne et stylée qui reflète votre marque personnelle
- L'arrière-plan doit être un lieu digne d'Instagram avec des éléments esthétiques, magnifiquement flouté
- Expression: engageante, accessible et charismatique
- Style moderne et tendance

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into an influencer-worthy headshot perfect for brand collaborations and sponsorship pitches. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be social media optimized with perfect skin enhancement
- My vibe is trendy and engaging, expression naturally photogenic
- Wearing modern and stylish attire that reflects your personal brand
- The background is an Instagram-worthy location with aesthetic elements, beautifully blurred
- Expression: engaging, approachable, and charismatic
- Modern and trendy style

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato digno de influencer perfecto para colaboraciones de marca y propuestas de patrocinio. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe estar optimizada para redes sociales con mejora perfecta de la piel
- Mi vibra es moderna y atractiva, expresión naturalmente fotogénica
- Vestir ropa moderna y elegante que refleje tu marca personal
- El fondo es una ubicación digna de Instagram con elementos estéticos, bellamente desenfocado
- Expresión: atractiva, accesible y carismática
- Estilo moderno y tendencia

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      real_estate: {
        fr: `Transformez cette photo en un portrait d'agent immobilier qui vend des maisons avant même que je parle. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être digne de confiance et réussi avec une confiance professionnelle
- Mon sourire doit être rassurant et compétent, transmettant l'expertise immobilière
- Portez un costume ou blazer professionnel élégant
- L'arrière-plan doit être une propriété haut de gamme ou un bureau immobilier moderne, luxueusement flouté
- Expression: confiante, chaleureuse et professionnelle
- Style réussi et accessible

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into a real estate agent headshot that sells houses before I even speak. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be trustworthy and successful with professional confidence
- My smile is reassuring and knowledgeable, conveying real estate expertise
- Wearing an elegant professional suit or blazer
- The background is an upscale property or modern real estate office, luxuriously blurred
- Expression: confident, warm, and professional
- Successful and approachable style

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato de agente inmobiliario que vende casas antes de que yo hable. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser confiable y exitosa con confianza profesional
- Mi sonrisa es tranquilizadora y experta, transmitiendo experiencia inmobiliaria
- Vestir un traje profesional elegante o blazer
- El fondo es una propiedad de lujo o una oficina inmobiliaria moderna, lujosamente desenfocado
- Expresión: confiada, cálida y profesional
- Estilo exitoso y accesible

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      entrepreneur: {
        fr: `Transformez cette photo en un portrait d'entrepreneur qui attire investisseurs et partenaires commerciaux. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être visionnaire et ambitieux avec des ombres orientées vers le succès
- Ma présence doit être innovante et déterminée, yeux reflétant le sens des affaires
- Portez une tenue moderne et professionnelle (blazer, chemise élégante)
- L'arrière-plan doit être un bureau de startup ou environnement commercial moderne, stratégiquement flouté
- Expression: innovante, confiante et visionnaire
- Style moderne et entrepreneurial

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into an entrepreneur's headshot that attracts investors and business partners. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be visionary and ambitious with success-oriented shadows
- My presence is innovative and determined, eyes reflecting business acumen
- Wearing modern professional attire (blazer, elegant shirt)
- The background is a startup office or modern business environment, strategically blurred
- Expression: innovative, confident, and visionary
- Modern and entrepreneurial style

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato de emprendedor que atrae inversores y socios comerciales. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser visionaria y ambiciosa con sombras orientadas al éxito
- Mi presencia es innovadora y determinada, ojos reflejando perspicacia empresarial
- Vestir ropa profesional moderna (blazer, camisa elegante)
- El fondo es una oficina de startup o ambiente de negocios moderno, estratégicamente desenfocado
- Expresión: innovadora, confiada y visionaria
- Estilo moderno y emprendedor

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      trades: {
        fr: `Transformez cette photo en un portrait professionnel d'artisan/technicien qui inspire confiance et compétence. IMPORTANT: Gardez exactement la même personne.

Instructions pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être naturel et authentique avec une lumière douce et uniforme
- Mon expression doit être compétente et fiable, transmettant l'expertise technique et le professionnalisme
- Portez une tenue de travail professionnelle propre (polo de travail, chemise de travail) ou une chemise décontractée professionnelle
- L'arrière-plan doit être un atelier ou environnement de travail professionnel propre, légèrement flouté
- Expression: confiante, fiable et professionnelle
- Style authentique et professionnel, pas trop formel
- Préservez l'authenticité et l'apparence de travailleur qualifié

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Seuls l'éclairage, l'arrière-plan et la tenue changent.`,
        en: `Transform this photo into a professional craftsman/technician portrait that inspires trust and competence. IMPORTANT: Keep exactly the same person.

Instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be natural and authentic with soft, even coverage
- My expression is competent and reliable, conveying technical expertise and professionalism
- Wearing clean professional work attire (work polo, work shirt) or professional casual shirt
- The background is a clean professional workshop or work environment, slightly blurred
- Expression: confident, reliable, and professional
- Authentic and professional style, not overly formal
- Preserve authenticity and skilled worker appearance

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Only lighting, background, and attire change.`,
        es: `Transforme esta foto en un retrato profesional de artesano/técnico que inspira confianza y competencia. IMPORTANTE: Mantén exactamente la misma persona.

Instrucciones para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser natural y auténtica con cobertura suave y uniforme
- Mi expresión es competente y confiable, transmitiendo experiencia técnica y profesionalismo
- Vestir ropa de trabajo profesional limpia (polo de trabajo, camisa de trabajo) o camisa casual profesional
- El fondo es un taller profesional limpio o ambiente de trabajo, ligeramente desenfocado
- Expresión: confiada, confiable y profesional
- Estilo auténtico y profesional, no demasiado formal
- Preservar la autenticidad y apariencia de trabajador cualificado

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). Solo cambian la iluminación, el fondo y la vestimenta.`,
      },
      general: {
        fr: `Transformez cette photo en une photo professionnelle de type LinkedIn parfaite pour un CV. IMPORTANT: Gardez exactement la même personne, le même visage, la même identité - préservez toutes les caractéristiques faciales, la texture de la peau naturelle, et l'apparence authentique.

Instructions de transformation pour ${description}:
- POSTURE CRITIQUE: Corrigez toute posture inappropriée - les mains NE DOIVENT PAS toucher le visage, le menton ou la tête. Les bras doivent être le long du corps ou croisés professionnellement. Posture droite et confiante.
- L'éclairage doit être naturel et de type lumière du jour avec une couverture douce et uniforme, évitant les éclairages artificiels ou trop dramatiques
- Mon sourire doit être authentique et confiant, les yeux faisant un contact direct avec la caméra
- Ma posture doit être professionnelle mais approchable, épaules légèrement tournées vers la caméra
- Si je ne porte pas de tenue professionnelle, ajoutez un blazer ou une chemise élégante de couleur neutre (bleu marine, gris, ou noir)
- L'arrière-plan doit être un espace de co-working moderne et lumineux avec des plantes et des éléments naturels, professionnellement flouté
- Améliorez subtilement la netteté et la qualité tout en préservant la texture de peau naturelle et les imperfections légères pour un look authentique
- Cadrez en portrait professionnel (tête et épaules)

CRITIQUE: Gardez EXACTEMENT la même personne. Modifiez la posture si nécessaire (retirez les mains du visage). Ne modifiez PAS: l'identité, le genre, l'ethnicité, les traits du visage, la forme du visage, les yeux, le nez, la bouche, ou toute caractéristique distinctive. Seuls l'éclairage, l'arrière-plan et la tenue doivent changer.`,
        en: `Transform this photo into a LinkedIn-perfect professional headshot suitable for a CV. IMPORTANT: Keep exactly the same person, the same face, the same identity - preserve all facial features, natural skin texture, and authentic appearance.

Transformation instructions for ${description}:
- POSTURE CRITICAL: Fix any inappropriate posture - hands MUST NOT touch face, chin, or head. Arms should be at sides or professionally crossed. Upright, confident posture.
- The lighting should be natural daylight with soft, even coverage, avoiding artificial or overly dramatic lighting
- My smile should be genuine and confident, eyes making direct contact with camera
- My posture should be professional yet approachable, shoulders slightly angled to camera
- If I'm not wearing professional attire, add an elegant blazer or shirt in neutral colors (navy blue, gray, or black)
- The background should be a bright, modern co-working space with plants and natural elements, professionally blurred
- Subtly enhance sharpness and quality while preserving natural skin texture and slight imperfections for an authentic look
- Frame as professional portrait (head and shoulders)

CRITICAL: Keep EXACTLY the same person. Modify posture if needed (remove hands from face). Do NOT modify: identity, gender, ethnicity, facial features, face shape, eyes, nose, mouth, or any distinctive characteristics. Only lighting, background, and attire should change.`,
        es: `Transforme esta foto en un retrato profesional perfecto para LinkedIn adecuado para un CV. IMPORTANTE: Mantén exactamente la misma persona, la misma cara, la misma identidad - preserva todas las características faciales, la textura natural de la piel y la apariencia auténtica.

Instrucciones de transformación para ${description}:
- POSTURA CRÍTICA: Corrija cualquier postura inapropiada - las manos NO DEBEN tocar la cara, el mentón o la cabeza. Los brazos deben estar a los lados o cruzados profesionalmente. Postura recta y confiada.
- La iluminación debe ser luz natural del día con cobertura suave y uniforme, evitando iluminación artificial o demasiado dramática
- Mi sonrisa debe ser genuina y confiada, ojos haciendo contacto directo con la cámara
- Mi postura debe ser profesional pero accesible, hombros ligeramente angulados hacia la cámara
- Si no llevo ropa profesional, agregar un blazer o camisa elegante en colores neutros (azul marino, gris o negro)
- El fondo debe ser un espacio de co-working moderno y luminoso con plantas y elementos naturales, profesionalmente desenfocado
- Mejorar sutilmente la nitidez y calidad mientras se preserva la textura natural de la piel y las imperfecciones leves para una apariencia auténtica
- Encuadrar como retrato profesional (cabeza y hombros)

CRÍTICO: Mantén EXACTAMENTE la misma persona. Modifica la postura si es necesario (retira las manos de la cara). NO modifiques: identidad, género, etnia, rasgos faciales, forma de la cara, ojos, nariz, boca, o cualquier característica distintiva. Solo deben cambiar la iluminación, el fondo y la vestimenta.`,
      },
    };

    const langPrompts = prompts[style] || prompts.general;
    return langPrompts[language] || langPrompts['en'];
  }

  /**
   * Generate a professional CV picture using Gemini 2.5 Flash Image (Nano Banana)
   * This uses IMAGE EDITING to transform the original photo into a professional CV photo
   * while preserving the person's identity
   * @param description - Description of the person (job title, style preference, etc.)
   * @param language - Language for the prompt
   * @param originalImageBase64 - Original image to edit (REQUIRED for editing)
   * @returns Base64 encoded image data
   */
  async generateProfessionalCVPicture(
    description: string,
    language: string = 'fr',
    originalImageBase64?: string,
  ): Promise<string> {
    try {
      if (!originalImageBase64) {
        throw new Error('Original image is required for professional CV picture generation');
      }

      this.logger.log('Editing photo with Gemini 3 Pro Image Preview...');
      this.logger.log(`Job/profession context: ${description}`);

      // Use Gemini 3 Pro Image Preview for image editing (best quality)
      const imageModel = this.genAI.getGenerativeModel({
        model: 'gemini-3-pro-image-preview'
      });

      // Determine professional context based on job description
      const promptStyle = this.determinePromptStyle(description);
      this.logger.log(`Using prompt style: ${promptStyle}`);

      // Get contextual prompt based on profession
      const editingPrompt = this.getContextualPrompt(promptStyle, description, language);

      // Prepare image data
      const imageData = originalImageBase64.startsWith('data:')
        ? originalImageBase64.split(',')[1]
        : originalImageBase64;

      // Call Gemini 2.5 Flash Image with the original image and editing instructions
      const result = await imageModel.generateContent([
        {
          text: editingPrompt,
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData,
          },
        },
      ]);

      const response = await result.response;

      // Extract the generated image from the response
      // The image is returned in the response parts as inline_data
      const parts = response.candidates?.[0]?.content?.parts;

      if (!parts || parts.length === 0) {
        throw new Error('No image parts in response');
      }

      // Find the image part
      let generatedImageBase64: string | null = null;
      for (const part of parts) {
        if (part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }

      if (!generatedImageBase64) {
        throw new Error('No image data found in response');
      }

      this.logger.log('Professional CV picture edited successfully with Gemini 3 Pro Image');
      return generatedImageBase64;

    } catch (error) {
      this.logger.error(`Error editing professional CV picture: ${error.message}`);
      throw error;
    }
  }

  /**
   * Alternative: Generate using text-to-image prompts
   * This is a fallback method that generates descriptive prompts
   */
  async generateCVPicturePrompt(
    jobTitle: string,
    gender: string = 'neutral',
    ethnicity: string = 'diverse',
    language: string = 'fr',
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const promptRequest = language === 'fr'
      ? `Génère une description détaillée pour créer une photo CV professionnelle pour un CV de ${jobTitle}.
         Genre: ${gender}, Ethnicité: ${ethnicity}.
         La description doit être en anglais et adaptée pour un générateur d'images IA.
         Inclure: apparence professionnelle, fond, éclairage, cadrage, expression, vêtements.`
      : `Generate a detailed description to create a professional CV picture for a ${jobTitle}.
         Gender: ${gender}, Ethnicity: ${ethnicity}.
         Description should be in English and suitable for an AI image generator.
         Include: professional appearance, background, lighting, framing, expression, clothing.`;

    const result = await model.generateContent(promptRequest);
    const response = await result.response;
    return response.text();
  }
}
