
# Krishi AI 4.0 - Smart Agri Ecosystem 🌾🤖

An integrated digital agriculture platform designed specifically for the agricultural landscape of Bangladesh. Krishi AI leverages state-of-the-art AI (Gemini 3 Flash, Qwen-2.5-VL) and orbital satellite data to provide authentic, scientific advisories.

## 🚀 Key Innovation Pillars

- **📸 Multi-Modal Scientific Audit:** Powered by Qwen-2.5-VL for high-precision pest, disease, and deficiency diagnosis grounded in BARI/BRRI standards.
- **🏺 Soil Expert 4.0:** Deep region-specific (AEZ) nutrient auditing based on BARC FRG 2024 protocols.
- **🧪 Pesticide Logic:** Official DAE dosage calculations and IRAC/FRAC chemical mixing safety analysis.
- **🗓️ Weather-Smart Calendar:** Integrates 7-day live weather forecasts with 5-year historical hazard analysis to suggest optimal sowing and fertilization windows.
- **🛰️ Satellite Monitoring:** Real-time NDVI and biomass tracking via orbital imagery for active field health tracking.

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Recharts
- **AI Core:** Google Gemini 3 Flash, Hugging Face (Qwen-VL, Mistral)
- **Mapping:** Google Maps Grounding API, BAMIS Weather Integration
- **Database/Storage:** Supabase, Firebase Auth

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- NPM or Yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/krishi-ai.git
   cd krishi-ai
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_google_gemini_key
   HF_TOKEN=your_huggingface_token
   SUPABASE_KEY=your_supabase_anon_key
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```

## ⚖️ Official Grounding

All advisories and calculations are governed by the following institutions:
- **BARC:** Bangladesh Agricultural Research Council
- **BARI:** Bangladesh Agricultural Research Institute
- **BRRI:** Bangladesh Rice Research Institute
- **DAE:** Department of Agricultural Extension
- **BAMIS:** Bangladesh Agro-Meteorological Information System

## 🤝 Contributing

We welcome scientific contributions. Please review the `CONTRIBUTING.md` for our standards on agricultural data integrity.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Empowering the roots of Bangladesh with the power of Artificial Intelligence.*

