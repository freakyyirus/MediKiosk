"""
Red Flag Detection Engine.
Detects medical emergencies from transcribed text.
Target: 30+ patterns for the clinical MVP.
"""

import re
from typing import Any

RED_FLAG_PATTERNS = [
    # ---- CARDIAC ----
    {
        "type": "chest_pain_mi",
        "severity": "critical",
        "keywords": ["chest pain", "heart attack", "crushing pain", "radiating to arm", "jaw pain", "sweating", "tightness in chest"],
        "regex": r"(?i)\b(chest pain|heart attack|crushing pain|tightness in chest|heaviness in chest)\b",
    },
    {
        "type": "cardiac_arrest",
        "severity": "critical",
        "keywords": ["collapsed", "not breathing", "no pulse", "unresponsive"],
        "regex": r"(?i)\b(collapsed|not breathing|no pulse|unresponsive|cardiac arrest)\b",
    },
    {
        "type": "severe_palpitations",
        "severity": "high",
        "keywords": ["heart racing", "palpitations", "irregular heartbeat", "pounding heart"],
        "regex": r"(?i)\b(heart racing|palpitations|irregular heartbeat|pounding heart|fast heartbeat)\b",
    },
    # ---- NEUROLOGICAL ----
    {
        "type": "stroke_fast",
        "severity": "critical",
        "keywords": ["slurred speech", "face drooping", "weakness in arm", "cannot move leg", "sudden numbness", "facial droop"],
        "regex": r"(?i)\b(slurred speech|face drooping|weakness in (arm|leg)|cannot move|sudden numbness|facial droop|one side|stroke)\b",
    },
    {
        "type": "severe_headache",
        "severity": "critical",
        "keywords": ["worst headache", "thunderclap", "sudden severe headache", "headache with stiff neck", "vomiting with headache"],
        "regex": r"(?i)\b(worst headache|thunderclap|sudden severe headache|headache.*stiff neck|vomiting.*headache)\b",
    },
    {
        "type": "seizure",
        "severity": "critical",
        "keywords": ["seizure", "convulsion", "fits", "shaking uncontrollably", "loss of consciousness"],
        "regex": r"(?i)\b(seizure|convulsion|fits|shaking uncontrollably|loss of consciousness|fell unconscious)\b",
    },
    {
        "type": "altered_mental_status",
        "severity": "critical",
        "keywords": ["confused", "not recognizing", "disoriented", "altered sensorium", "drowsy", "unresponsive"],
        "regex": r"(?i)\b(confused|not recognizing|disoriented|altered sensorium|very drowsy|unresponsive|not making sense)\b",
    },
    # ---- RESPIRATORY ----
    {
        "type": "severe_dyspnea",
        "severity": "critical",
        "keywords": ["cannot breathe", "breathless", "severe breathing difficulty", "choking", "gasping"],
        "regex": r"(?i)\b(cannot breathe|severe breathless|breathing difficulty|choking|gasping|unable to breathe|gasping for breath)\b",
    },
    {
        "type": "hemoptysis",
        "severity": "high",
        "keywords": ["coughing blood", "blood in sputum", "coughing up blood"],
        "regex": r"(?i)\b(coughing blood|blood in sputum|coughing up blood|spitting blood)\b",
    },
    {
        "type": "pneumothorax",
        "severity": "critical",
        "keywords": ["sudden chest pain with breathlessness", "one side chest pain", "sharp chest pain breathing"],
        "regex": r"(?i)\b(sudden.*chest pain.*breath|sharp.*chest.*breathing|one sided chest)\b",
    },
    # ---- GASTROINTESTINAL ----
    {
        "type": "gi_bleed",
        "severity": "critical",
        "keywords": ["vomiting blood", "black stool", "blood in stool", "hematemesis", "melena"],
        "regex": r"(?i)\b(vomiting blood|black stool|blood in stool|hematemesis|melena|red blood.*stool)\b",
    },
    {
        "type": "acute_abdomen",
        "severity": "critical",
        "keywords": ["severe abdominal pain", "rigid abdomen", "board-like abdomen", "acute abdomen"],
        "regex": r"(?i)\b(severe abdominal pain|rigid abdomen|board.like abdomen|acute abdomen|stomach very hard)\b",
    },
    {
        "type": "peritonitis",
        "severity": "critical",
        "keywords": ["worse on touching", "pain on pressing", "abdomen rigid"],
        "regex": r"(?i)\b(worse on touching|pain on pressing abdomen|abdomen rigid|rebound tenderness)\b",
    },
    # ---- TRAUMA ----
    {
        "type": "head_injury",
        "severity": "critical",
        "keywords": ["hit head", "head injury", "knocked out", "fell and hit head", "scalp wound"],
        "regex": r"(?i)\b(hit head|head injury|knocked out|fell.*hit head|scalp wound|head trauma)\b",
    },
    {
        "type": "major_trauma",
        "severity": "critical",
        "keywords": ["accident", "road accident", "crush injury", "fall from height", "stabbing", "gunshot"],
        "regex": r"(?i)\b(road accident|car accident|crush injury|fall from height|stabbing|gunshot|motorcycle accident)\b",
    },
    {
        "type": "spinal_injury",
        "severity": "critical",
        "keywords": ["cannot feel legs", "back pain after fall", "numbness after injury", "paralysis after accident"],
        "regex": r"(?i)\b(cannot feel legs|back pain after fall|numbness after injury|paralysis after accident|back injury)\b",
    },
    # ---- ANAPHYLAXIS / ALLERGIC ----
    {
        "type": "anaphylaxis",
        "severity": "critical",
        "keywords": ["swollen throat", "difficulty swallowing", "swollen lips", "hives all over", "throat closing", "allergic reaction severe"],
        "regex": r"(?i)\b(swollen throat|difficulty swallowing|swollen lips|hives all over|throat closing|allergic reaction severe|tongue swollen)\b",
    },
    # ---- OB/GYN ----
    {
        "type": "ectopic_pregnancy",
        "severity": "critical",
        "keywords": ["pregnant with abdominal pain", "pregnant and bleeding", "missed period with pain"],
        "regex": r"(?i)\b(pregnant.*abdominal pain|pregnant.*bleeding|missed period.*pain)\b",
    },
    {
        "type": "severe_preeclampsia",
        "severity": "critical",
        "keywords": ["severe headache pregnancy", "visual changes pregnancy", "swelling pregnancy", "eclampsia"],
        "regex": r"(?i)\b(severe headache.*pregnan|visual changes.*pregnan|swelling.*pregnan|eclampsia|fits.*pregnan)\b",
    },
    {
        "type": "ob hemorrhage",
        "severity": "critical",
        "keywords": ["heavy bleeding after delivery", "postpartum hemorrhage", "bleeding after birth"],
        "regex": r"(?i)\b(heavy bleeding after delivery|postpartum hemorrhage|bleeding after birth)\b",
    },
    # ---- INFECTIOUS ----
    {
        "type": "meningitis",
        "severity": "critical",
        "keywords": ["stiff neck with fever", "headache fever vomiting", "neck stiffness", "photophobia with fever"],
        "regex": r"(?i)\b(stiff neck.*fever|headache.*fever.*vomit|neck stiffness|photophobia.*fever)\b",
    },
    {
        "type": "sepsis",
        "severity": "critical",
        "keywords": ["fever with confusion", "very high fever", "chills shaking", "fever with rash", "low temperature"],
        "regex": r"(?i)\b(fever.*confusion|very high fever|chills.*shaking|fever.*rash|temperature low|feeling very cold)\b",
    },
    {
        "type": "high_fever_child",
        "severity": "high",
        "keywords": ["child fever", "baby fever", "infant fever", "fever in child", "child convulsion"],
        "regex": r"(?i)\b(child.*fever|baby.*fever|infant.*fever|fever in child|child.*convulsion|child.*fits)\b",
    },
    # ---- METABOLIC ----
    {
        "type": "diabetic_emergency",
        "severity": "critical",
        "keywords": ["diabetic unconscious", "sugar very low", "hypoglycemia", "diabetic ketoacidosis", "sugar very high"],
        "regex": r"(?i)\b(diabetic.*unconscious|sugar very low|hypoglycemia|diabetic ketoacidosis|sugar very high|DKA)\b",
    },
    {
        "type": "thyroid_storm",
        "severity": "critical",
        "keywords": ["thyroid storm", "severe hyperthyroid", "rapid pulse fever"],
        "regex": r"(?i)\b(thyroid storm|severe hyperthyroid|rapid pulse.*fever)\b",
    },
    # ---- PSYCHIATRIC ----
    {
        "type": "suicide_risk",
        "severity": "critical",
        "keywords": ["want to die", "kill myself", "end my life", "suicide", "overdose", "swallowed pills"],
        "regex": r"(?i)\b(want to die|kill myself|end my life|suicide|overdose|swallowed pills|took pills)\b",
    },
    {
        "type": "agitated_state",
        "severity": "high",
        "keywords": ["very agitated", " violent", " thrashing", " out of control"],
        "regex": r"(?i)\b(very agitated|violent|thrashing|out of control|attacking)\b",
    },
    # ---- DRUG / TOXICOLOGY ----
    {
        "type": "drug_overdose",
        "severity": "critical",
        "keywords": ["took too many tablets", "drug overdose", "poisoning", "ingested poison", "swallowed chemical"],
        "regex": r"(?i)\b(took too many tablet|drug overdose|poisoning|ingested poison|swallowed chemical|overdose)\b",
    },
    # ---- PEDIATRIC ----
    {
        "type": "pediatric_respiratory",
        "severity": "critical",
        "keywords": ["child breathing fast", "baby blue lips", "child not breathing well", "infant grunting"],
        "regex": r"(?i)\b(child breathing fast|baby blue lips|child not breathing|infant grunting|child wheezing badly)\b",
    },
    {
        "type": "pediatric_dehydration",
        "severity": "high",
        "keywords": ["child not drinking", "no urine child", "sunken eyes child", "child very weak"],
        "regex": r"(?i)\b(child not drinking|no urine.*child|sunken eyes.*child|child very weak|child no tears)\b",
    },
    # ---- MISCELLANEOUS ----
    {
        "type": "severe_bleeding",
        "severity": "critical",
        "keywords": ["bleeding heavily", "cannot stop bleeding", "blood everywhere", "severe hemorrhage"],
        "regex": r"(?i)\b(bleeding heavily|cannot stop bleeding|blood everywhere|severe hemorrhage|pouring blood)\b",
    },
    {
        "type": "eye_emergency",
        "severity": "high",
        "keywords": ["chemical in eye", "eye injury", "sudden vision loss", "eye pain severe"],
        "regex": r"(?i)\b(chemical in eye|eye injury|sudden vision loss|eye pain severe|eye burn)\b",
    },
    {
        "type": "burns_major",
        "severity": "critical",
        "keywords": ["burn", "fire injury", "scalding", "burns on face", "burns on hands"],
        "regex": r"(?i)\b(burn.*fire|fire injury|scalding|burns on face|burns on hand|burned badly)\b",
    },
]


class RedFlagEngine:
    """Rule-based engine to detect critical symptoms instantly."""

    def analyze(self, text: str) -> list[dict[str, Any]]:
        """Analyze text and return triggered red flags."""
        flags: list[dict[str, Any]] = []
        seen_types: set[str] = set()

        for pattern in RED_FLAG_PATTERNS:
            if re.search(pattern["regex"], text) and pattern["type"] not in seen_types:
                flags.append(
                    {
                        "type": pattern["type"],
                        "severity": pattern["severity"],
                        "confidence": 0.90,
                        "triggered_by": [kw for kw in pattern["keywords"] if kw.lower() in text.lower()],
                    }
                )
                seen_types.add(pattern["type"])

        return flags
