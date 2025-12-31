FreeFlow Dialog Policy

Cele UX
- Zbieraj tylko kluczowe dane, resztę domyślaj.
- Jedno pytanie naraz. Przy prostym zamówieniu maksymalnie dwa pytania (np. rozmiar + ostrość).
- Zawsze proponuj gotową sugestię i chipsy do doprecyzowania.
- Jeśli kluczowe sloty są pełne — od razu proś o potwierdzenie.

Sloty
- required: item, size, spice
- optional: toppings[], crust, dietary, time, address

Domyślne: size=M, spice=łagodna, style=klasyczna.

Format odpowiedzi LLM
{
  "speech": "krótka wypowiedź do TTS",
  "ui_suggestions": ["M","Łagodna","Dodaj napój"],
  "slots": {},
  "readyToConfirm": false
}

Kolejność pytań
1. item (jeśli nieznany)
2. size (M domyślnie)
3. spice (łagodna domyślnie) → potem gotowa propozycja + “Potwierdź”.

TTS
- Zdania krótkie (≤ ~12 słów).
- Pauzy 200–300ms (SSML).



