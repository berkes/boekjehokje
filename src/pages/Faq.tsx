import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
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
