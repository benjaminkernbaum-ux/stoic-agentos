#!/usr/bin/env python3
"""
Stoic Tactical Research Bot v2.0
================================
Analista quantitativo alimentado por IA com base na pesquisa tática proprietária da Stoic.
Usa Google Gemini via SDK oficial (google-generativeai).
"""

import os
import sys

def main():
    # ── Tentar importar o SDK, instalar se necessário ──
    try:
        import google.generativeai as genai
    except ImportError:
        print("[SETUP] Instalando SDK do Google Gemini...")
        os.system(f'"{sys.executable}" -m pip install -q google-generativeai')
        import google.generativeai as genai

    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║     STOIC TACTICAL RESEARCH BOT  v2.0           ║")
    print("║     Analista Quantitativo • Gemini 2.0 Flash    ║")
    print("╚══════════════════════════════════════════════════╝")
    print()

    # ── API Key ──
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        api_key = input("  🔑 Cole sua chave do Google AI Studio (AIza...): ").strip()

    if not api_key or not api_key.startswith("AIza"):
        print("\n  ❌ Chave inválida. Pegue em: https://aistudio.google.com/app/apikey")
        input("\n  Pressione Enter para sair...")
        return

    genai.configure(api_key=api_key)

    # ── Carregar arquivos ──
    script_dir = os.path.dirname(os.path.abspath(__file__))

    try:
        with open(os.path.join(script_dir, "stoic_text.txt"), "r", encoding="utf-8") as f:
            knowledge_base = f.read()
        print(f"  ✅ Base de conhecimento carregada ({len(knowledge_base):,} chars)")
    except FileNotFoundError:
        print("  ❌ Arquivo stoic_text.txt não encontrado!")
        input("\n  Pressione Enter para sair...")
        return

    try:
        with open(os.path.join(script_dir, "system_prompt.txt"), "r", encoding="utf-8") as f:
            system_prompt = f.read()
        print("  ✅ System prompt carregado")
    except FileNotFoundError:
        system_prompt = "You are a quantitative market analyst. Be precise and direct."
        print("  ⚠️  System prompt não encontrado, usando padrão")

    # ── Inicializar modelo ──
    full_instruction = f"{system_prompt}\n\n--- KNOWLEDGE BASE START ---\n{knowledge_base}\n--- KNOWLEDGE BASE END ---"

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=full_instruction
    )

    chat = model.start_chat(history=[])

    print("  ✅ Modelo Gemini 2.0 Flash conectado")
    print()
    print("──────────────────────────────────────────────────")
    print("  Bot pronto! Digite sua pergunta.")
    print("  Comandos: 'sair' para encerrar | 'limpar' para resetar")
    print("──────────────────────────────────────────────────")

    # ── Loop de conversa ──
    while True:
        try:
            print()
            user_input = input("  Você: ").strip()

            if not user_input:
                continue

            if user_input.lower() in ("sair", "exit", "quit"):
                print("\n  👋 Encerrando. Até a próxima análise!")
                break

            if user_input.lower() in ("limpar", "clear", "reset"):
                chat = model.start_chat(history=[])
                print("  🔄 Conversa resetada.")
                continue

            print("\n  📊 Analisando...\n")

            response = chat.send_message(user_input)
            print(f"  Bot: {response.text}")

        except KeyboardInterrupt:
            print("\n\n  👋 Encerrando.")
            break
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                print(f"\n  ⏳ Rate limit atingido. Aguarde ~10s e tente novamente.")
            elif "403" in error_msg:
                print(f"\n  🔒 Acesso negado. Verifique sua chave em: https://aistudio.google.com/app/apikey")
            else:
                print(f"\n  ❌ Erro: {error_msg}")


if __name__ == "__main__":
    main()
