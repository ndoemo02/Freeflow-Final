# Product

## Register

product

## Users

Polscy użytkownicy mobilni zamawiający jedzenie głosem. Kontekst użycia: w ruchu, jedno ręką, często głodny i niecierpliwy. Nie chcą klikać — chcą powiedzieć "zamów mi margheritę z Pizzerii Roma" i gotowe. Drugorzędni użytkownicy: restauratorzy i inwestorzy oceniający demo produktu (warstwa "review audit").

Primary job: zamówić jedzenie przez rozmowę głosową w czasie < 60 sekund, bez dotykania ekranu.

## Product Purpose

FreeFlow to głosowy asystent zamawiania jedzenia napędzany Gemini Live AI. Asystentka "Amber" rozumie polskie polecenia, lokalizuje restauracje GPS, przegląda menu i dodaje do koszyka — wszystko w dialogu głosowym. Sukces: użytkownik mówi raz, dostaje jedzenie. Bez menu-scrollowania, bez formularzy, bez friction.

## Brand Personality

Szybki · Inteligentny · Przyjazny  
Premium · Nowoczesny · Pewny siebie  
Lokalny · Naturalny · Zaufany

Ton Amber: ciepły i konkretny jak dobry kelner — nie chatbot, nie korporacyjny asystent. Mówi po polsku, rozumie kontekst, nie pyta o rzeczy które wie.

## Anti-references

- **Uber Eats / Pyszne.pl / Glovo**: standardowy delivery grid, zero karakteru AI, czuć jak sklep nie jak asystent
- **Chaotyczne layouty**: random kolory, crowded cards, nieczytelna hierarchia, "bazar" feel
- **Korporacyjny SaaS**: szare dashboardy, tabele, enterprise typography, zimna kolorystyka
- **Skomplikowany technicznie**: onboardingi, tutoriale, manual steps — jeśli trzeba wyjaśniać jak zamawiać głosem, coś poszło nie tak
- **Generyczny dark mode**: sam ciemny theme nie wystarczy — HUD/OS aesthetic musi być celowy i spójny

## Design Principles

1. **Głos jest interfejsem** — każdy element UI wspiera lub ustępuje miejsca interakcji głosowej; wizualia potwierdzają co Amber powiedziała, nie zastępują dialogu
2. **Pewność przez precyzję** — premium feel pochodzi z dokładności: wyrównanie do piksela, konsekwentne tokeny, żadnych "prawie" kolorów
3. **Lokalne, nie globalne** — polska restauracja, polskie menu, polskie nazwy ulic — design musi czuć się jak coś znajomego, nie jak import
4. **Zero wysiłku dla szczęśliwej ścieżki** — główny flow (znajdź → wybierz → kup) ma być tak płynny że użytkownik zapomina że używa aplikacji
5. **Warstwa demo jest też produktem** — panel SystemOS / Live Trace jest pokazywany inwestorom; musi wyglądać jak produkcja, nie jak devtools

## Accessibility & Inclusion

- WCAG 2.1 AA jako minimum; kontrast body text ≥ 4.5:1
- Głos jako primary input — redukcja cognitive load w UI wizualnym
- Reduced motion: animacje Amber (pulse, glow) muszą mieć `prefers-reduced-motion` fallback
- Polska lokalizacja: daty, ceny PLN (zł), adresy w formacie PL
