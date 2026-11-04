import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Link from "@mui/material/Link";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type FaqEntry = {
  vraag: string;
  antwoord: React.ReactNode;
};

/**
 * FAQ page ("Veelgestelde vragen"), publicly reachable without logging in.
 * The questions and answers are written inline below: adding, changing or
 * removing a question is a small hand-edit of this file.
 */
export function Faq(): React.JSX.Element {
  const faqEntries: readonly FaqEntry[] = [
    {
      vraag:
        "Waarom moet ik inloggen met een Google-account met toegang tot de NYMA-agenda?",
      antwoord: (
        <>
          Alle boekingen staan in de gedeelde NYMA Google Agenda. Boekjehokje
          leest en schrijft in diezelfde agenda, en Google Calendar is de bron
          van waarheid. Daarom heb je een Google-account nodig met toegang tot
          de NYMA-agenda: zonder toegang kan de app geen boekingen zien of
          maken.
        </>
      ),
    },
    {
      vraag: "Ik ben ingelogd met mijn Google-account, maar zie niks.",
      antwoord: (
        <>
          Controleer of je bent ingelogd met het account waarmee je bij de
          NYMA-agenda kunt. Boekjehokje leest de boekingen met dat account; met
          een ander Google-account (bijvoorbeeld je privé-account) zie je geen
          ruimtes of boekingen. Log uit en log opnieuw in met het juiste
          account.
        </>
      ),
    },
    {
      vraag: "Moet ik de app gebruiken?",
      antwoord: (
        <>
          Nee, dat hoeft niet. Je kunt de NYMA-agenda gewoon blijven gebruiken
          zoals je gewend bent. Boekjehokje leest en schrijft in diezelfde
          agenda, maar presenteert alles overzichtelijk en gestructureerd.
        </>
      ),
    },
    {
      vraag: "Waar is de workshopruimte?",
      antwoord: (
        <>
          De workshopruimte is gesloten en tot nader bericht niet boekbaar,
          zoals NYMA in oktober 2026 heeft aangekondigd.
        </>
      ),
    },
    {
      vraag: "Waarom krijg ik waarschuwingen over 5 minuten?",
      antwoord: (
        <>
          Tussen twee boekingen in dezelfde ruimte raden we een marge van 5
          minuten aan, zodat je de ruimte kunt opruimen en de volgende groep
          zich kan installeren. De marge wordt aangemoedigd, nooit afgedwongen:
          standaard beginnen boekingen op het hele uur en eindigen ze vijf
          minuten voor het volgende hele uur (bijvoorbeeld 14:00–14:55). Boek je
          expres direct aansluitend, zonder marge, dan krijg je daarvoor een
          waarschuwing die je mag negeren. Overlappende boekingen zijn nooit
          mogelijk.
        </>
      ),
    },
    {
      vraag: "Wat is 'Onbekend'?",
      antwoord: (
        <>
          Een fictieve ruimte waarin we alle boekingen zetten die we niet konden
          koppelen aan een echte ruimte. Bijvoorbeeld door een typefout
          ('Ketshok 03'), een niet-bestaande ruimte ('KH 06'), of omdat de
          boeking zich niet houdt aan de afspraken over het opmaken van
          boekingen.
        </>
      ),
    },
    {
      vraag: "Wie heeft dit gebouwd?",
      antwoord: <>
        <Link href="https://berk.es">Bèr Kessels</Link> uit unit 65/63.
        Met <Link href="https://chat.mistral.ai">Mistral Vibe</Link>: Goede, Open Source, Europese AI.
      </>,
    },
    {
      vraag: "Ik zie een bug.",
      antwoord: (
        <>
          Meld de bug op{" "}
          <Link href="https://github.com/berkes/boekjehokje/issues">
            onze issue tracker
          </Link>{" "}
          en voeg een schermafdruk toe, dan kunnen we het snel oplossen.
        </>
      ),
    },
    {
      vraag: "Ik mis iets, of ik wil iets.",
      antwoord: (
        <>
          Feature requests kun je ook op{" "}
          <Link href="https://github.com/berkes/boekjehokje/issues">
            de issue tracker
          </Link>{" "}
          zetten. Leg vooral uit waarom je het wilt.
        </>
      ),
    },
    {
      vraag: "Kan ik helpen?",
      antwoord: (
        <>
          Jazeker! Boekjehokje is open source:{" "}
          <Link href="https://github.com/berkes/boekjehokje">
            github.com/berkes/boekjehokje
          </Link>
          .
        </>
      ),
    },
  ];

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h2" component="h1" sx={{ mb: 4 }}>
        Veelgestelde vragen
      </Typography>
      <Box sx={{ maxWidth: 800 }}>
        {faqEntries.map((entry) => (
          <Accordion key={entry.vraag}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`faq-panel-${entry.vraag}`}
              id={`faq-header-${entry.vraag}`}
            >
              <Typography component="span" sx={{ fontWeight: "bold" }}>
                {entry.vraag}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>{entry.antwoord}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}
