// On joue avec les pages : clics partout, défi final, permis.
const { test, expect } = require("@playwright/test");
const { PAGES, FICHES, MOVED, NO_PROBLEM, url, open, iconsReady, displayProblems, playEverything, maxEverything } = require("./site");
const { contrastIssues } = require("./contrast");

for (const f of PAGES) {
  for (const query of ["", "?atelier=1"]) {
    test(`${f}${query && " en mode atelier"} : tout cliquer ne casse rien`, async ({ page }) => {
      const errors = await open(page, f, query);
      await playEverything(page);
      expect(errors).toEqual([]);
      expect(await displayProblems(page)).toEqual(NO_PROBLEM);
    });
  }
}

// Les jeux poussés au maximum : les nombres deviennent longs (« 4 040 000 » tokens lus), ils restent dans leurs cases.
// Sur téléphone, on prend un petit écran (360 px) : c'est là que les cases sont les plus étroites.
for (const f of FICHES) {
  test(`${f} : au maximum, les nombres tiennent dans leurs cases`, async ({ page, isMobile }) => {
    if (isMobile) await page.setViewportSize({ width: 360, height: 780 });
    const errors = await open(page, f);
    await maxEverything(page);
    expect(errors).toEqual([]);
    expect((await displayProblems(page)).debordements).toEqual([]);
  });
}

// Si le système demande moins d'animations, rien ne bouge : ni animation CSS, ni transition, ni animation lancée en JS.
for (const f of PAGES) {
  test(`${f} : aucune animation quand le système le demande`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, f);
    await playEverything(page, 1);
    const running = await page.evaluate(() => document.getAnimations().map((a) => a.animationName || a.transitionProperty || "JS"));
    expect(running).toEqual([]);
  });
}

for (const f of FICHES) {
  test(`${f} : finir le défi donne le badge`, async ({ page }) => {
    await open(page, f);
    for (const q of await page.locator("#defiQuiz .qi").all()) await q.locator(".qbtns button").first().click();
    await expect(page.locator("#badge")).toHaveClass(/won/);
    await expect(page.locator("#defiResult")).not.toBeEmpty();
    await expect(page.locator("#stars svg")).toHaveCount(3);
    // La progression est rangée sous le nom de la fiche (const FICHE dans la page).
    const [id, saved] = await page.evaluate(() => [FICHE, JSON.parse(localStorage.getItem("ia6:progress"))]);
    expect(saved[id]).toBeGreaterThan(0);
  });
}

test.describe("2-memoire.html : l'IA relit tout, à chaque message", () => {
  for (const colorScheme of ["dark", "light"]) {
    test(`l'animation va jusqu'au bout, lisible à chaque étape (thème ${colorScheme === "dark" ? "sombre" : "clair"})`, async ({ page, isMobile }) => {
      test.skip(isMobile && colorScheme === "light", "mêmes couleurs que sur bureau");
      // Sans animation, chaque étape se joue tout de suite.
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme });
      await open(page, "2-memoire.html");
      const next = page.locator("#rpNext");
      for (let step = 1; step <= 6; step++) {
        await next.click();
        // L'étape est finie quand le bouton revient (ou disparaît, à la fin).
        await page.waitForFunction(() => { const b = document.querySelector("#rpNext"); return b.hidden || !b.disabled; });
        await iconsReady(page);
        expect(await contrastIssues(page), `étape ${step}`).toEqual([]);
      }
      await expect(next).toBeHidden();
      await expect(page.locator("#rpBars .srow")).toHaveCount(5);
      // Après la compression, le milieu est un résumé : « Je n'aime pas le bateau » n'est plus lu.
      await expect(page.locator("#rpRead .rl.sum")).toHaveCount(1);
      await expect(page.locator("#rpRead")).not.toContainText("bateau");
      await expect(page.locator("#rpChat .cb.lost")).toContainText("Je n'aime pas le bateau");
      await page.locator("#rpReset").click();
      await expect(page.locator("#rpChat .cb")).toHaveCount(0);
      await expect(next).toBeEnabled();
    });
  }
});

test("1-tokens.html : le compte est bon se gagne en 3 manches", async ({ page }) => {
  await open(page, "1-tokens.html");
  // « oui » fait 1 token : une phrase de N « oui » fait N tokens.
  for (const goal of [5, 12, 20]) {
    await page.locator("#cbTxt").fill(Array(goal).fill("oui").join(" "));
    await page.locator("#cbCheck").click();
    await expect(page.locator("#cbResult")).toContainText("Le compte est bon");
    await page.locator("#cbNext").click();
  }
  // « Rejouer » repart de la manche 1. Un mot long fait plusieurs tokens : 7 au lieu de 5.
  await expect(page.locator("#cbScore")).toHaveText("0 / 3");
  await page.locator("#cbTxt").fill("anticonstitutionnellement");
  await page.locator("#cbCheck").click();
  await expect(page.locator("#cbResult")).toContainText("2 de trop");
  await expect(page.locator("#cbToks .tok")).toHaveCount(7);
  // Un nombre se coupe par paquets de 3 chiffres, comme chez les vrais découpeurs : 2026 = 202 + 6.
  await page.locator("#cbTxt").fill("2026");
  await page.locator("#cbCheck").click();
  await expect(page.locator("#cbToks .tok")).toHaveText(["202", "6"]);
});

test("3-modele-effort.html : une info en trop qui ressemble à la bonne peut tromper l'IA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "3-modele-effort.html");
  const answer = page.locator("#dAnswer"), pill = page.locator("#dPill");
  await expect(answer).toContainText("35 €");
  await expect(pill).toHaveClass(/ok/);
  // L'anecdote gêne peu. L'ancien prix ressemble au bon : il passe dans la réponse.
  await page.locator('label[for="dAnec"]').click();
  await expect(page.locator("#dPrompt .extra")).toHaveCount(1);
  await expect(pill).not.toHaveClass(/warn|bad/);
  await page.locator('label[for="dPrix"]').click();
  await expect(answer).toContainText("30 €");
  await expect(pill).toHaveClass(/warn/);
  await page.locator('label[for="dDate"]').click();
  await expect(answer).toContainText("15 octobre");
  await expect(pill).toHaveClass(/bad/);
  // Le schéma : à la dernière étape, l'IA peut prendre l'ancien prix.
  for (let i = 0; i < 3; i++) await page.locator("#whyProc .proc-nav .go").click();
  await expect(page.locator("#whySlot")).toHaveText("30 €");
});

test("4-hallucinations.html : des documents en trop qui ressemblent à la réponse trompent l'IA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "4-hallucinations.html");
  // Les chercheurs : 4 documents qui ressemblent à la réponse, 27 bonnes réponses sur 100. Au hasard : 31.
  await page.locator("#distGuess .qbtns button").first().click();
  const four = page.locator("#noiseBars .hb").nth(3).locator(".hb-n");
  await expect(four).toHaveText("27");
  await page.locator('#segNoise button[data-v="rand"]').click();
  await expect(four).toHaveText("31");
});

test("2-memoire.html : le context rot, plus le texte est long, plus l'IA rate de détails", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "2-memoire.html");
  await page.locator("#rotGuess .qbtns button").first().click();
  const million = page.locator("#rotBars .hb").last().locator(".hb-n");
  await expect(million).toHaveText("74");
  await page.locator('#segRot button[data-v="before"]').click();
  await expect(million).toHaveText("37");
  await page.locator('#segFocus button[data-v="full"]').click();
  await expect(page.locator("#focusBars .hb-n")).toHaveText(["90", "81", "62"]);
});

test("2-memoire.html : la mémoire se remplit, se compresse 2 fois, et l'IA perd l'allergie", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "2-memoire.html");
  const proc = page.locator("#memProc"), next = proc.locator(".proc-nav .go"), win = page.locator("#win");
  const allergy = page.locator("#facts li").nth(2), answer = page.locator("#memChat .cb.ai");
  // Message 50 : le catalogue et les messages sont en entier.
  await expect(win.locator(".wb.doc")).toHaveCount(1);
  await expect(win.locator(".wb.sum")).toHaveCount(0);
  await expect(page.locator("#winCmp")).toHaveText("Aucune compression");
  // Message 250 : le 5e bloc ne tient plus. Le catalogue et les messages 1 à 150 deviennent un résumé.
  await next.click();
  await next.click();
  await expect(page.locator("#winCmp")).toHaveText(/1\scompression$/);
  await expect(win.locator(".wb.sum")).toHaveText(/1\sà\s150/);
  await expect(win.locator(".wb.doc")).toHaveCount(0);
  await expect(win.locator(".wb.msg")).toHaveCount(2);
  await expect(page.locator("#sumTxt")).toContainText("allergique");
  // Message 400 : la mémoire s'est remplie à nouveau. Le 2e résumé résume aussi le 1er : l'allergie disparaît.
  await next.click();
  await expect(page.locator("#winCmp")).toHaveText(/2\scompressions/);
  await expect(win.locator(".wb.sum")).toHaveText(/1\sà\s300/);
  await expect(page.locator("#sumTxt")).not.toContainText("allergique");
  await expect(allergy).toHaveClass(/lost/);
  // Ta question : l'IA propose des fruits de mer. Le rappel, juste avant la question, corrige la réponse.
  await next.click();
  await expect(answer).toContainText("plateau de fruits de mer");
  await next.click();
  await expect(answer).toContainText("sans fruits de mer");
  await expect(allergy).not.toHaveClass(/lost/);
  // Avec 1 million de tokens : pas de compression, l'IA a encore l'allergie.
  await page.locator('#segWin button[data-v="1000000"]').click();
  await proc.locator(".proc-rail button").nth(4).click();
  await expect(page.locator("#winCmp")).toHaveText("Aucune compression");
  await expect(win.locator(".wb.sum")).toHaveCount(0);
  await expect(answer).toContainText("Pas de fruits de mer");
});

// À chaque étape, avec les 2 tailles de mémoire : rien ne dépasse, rien n'est mal coupé, chaque texte se lit.
// Sur téléphone, on prend un petit écran (360 px) : c'est là que la fenêtre et les infos du devis sont les plus étroites.
test("2-memoire.html : la mémoire pas à pas reste lisible à chaque étape", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (isMobile) await page.setViewportSize({ width: 360, height: 780 });
  await open(page, "2-memoire.html", "?demo=1");
  const rail = page.locator("#memProc .proc-rail button");
  for (const size of ["200000", "1000000"]) {
    await page.locator(`#segWin button[data-v="${size}"]`).click();
    for (let i = 0; i < 6; i++) {
      await rail.nth(i).click();
      await iconsReady(page);
      const where = `${size} tokens, étape ${i + 1}`;
      expect(await displayProblems(page), where).toEqual(NO_PROBLEM);
      expect(await contrastIssues(page), where).toEqual([]);
    }
  }
});

test("2-memoire.html : ta journée, la suite d'une tâche continue la conversation, une autre tâche en ouvre une nouvelle", async ({ page }) => {
  await open(page, "2-memoire.html");
  const card = page.locator("#dayCard"), cont = card.locator(".btn").first(), fresh = card.locator(".btn").last();
  // 10 h : le client change les dates (la suite du devis). 14 h : le planning (une autre tâche).
  // 16 h : un congé à placer (la suite du planning, qui est la conversation ouverte).
  for (const [pick, open] of [[cont, "Le devis"], [fresh, "Le devis"], [cont, "Le planning"]]) {
    // La tâche ne dit pas si c'est un nouveau sujet : c'est au joueur de le voir.
    await expect(card).not.toContainText(/sujet/i);
    await expect(card.locator(".day-open")).toContainText(open);
    await pick.click();
  }
  await expect(page.locator("#dayScore")).toHaveText("3 / 3");
  await expect(page.locator("#dayLog li.ok")).toHaveCount(3);
  await expect(page.locator("#dayConvN")).toHaveText("2");
});

test("5-complaisance.html : choisir chaque version neutre donne 4 sur 4", async ({ page }) => {
  await open(page, "5-complaisance.html");
  for (let r = 0; r < 4; r++) {
    // La version neutre est marquée dans les données de la page (NQ).
    const i = await page.evaluate((k) => NQ[k].o.findIndex(([, ok]) => ok), r);
    await page.locator("#nqOpts button").nth(i).click();
    await expect(page.locator("#nqResult")).toContainText("Bien vu");
    if (r < 3) await page.locator("#nqNext").click();
  }
  await expect(page.locator("#nqScore")).toHaveText("4 / 4");
  await expect(page.locator("#nqResult")).toContainText("4 sur 4");
  // « Rejouer », puis une mauvaise réponse : la correction montre la version neutre.
  await page.locator("#nqNext").click();
  const wrong = await page.evaluate(() => NQ[0].o.findIndex(([, ok]) => !ok));
  await page.locator("#nqOpts button").nth(wrong).click();
  await expect(page.locator("#nqResult")).toContainText("La version neutre");
  await expect(page.locator("#nqScore")).toHaveText("0 / 4");
});

test("4-hallucinations.html : changer la règle du classement change le gagnant", async ({ page }) => {
  await open(page, "4-hallucinations.html");
  await page.locator("#rankGuess .qbtns button").first().click();
  const leader = () => page.locator(".rk:has(.rk-place.win) .rk-name strong");
  await expect(leader()).toHaveText("o4-mini");
  await page.locator('#segRule button[data-v="fair"]').click();
  await expect(leader()).toHaveText("gpt-5-thinking-mini");
  await expect(page.locator(".rk-n")).toHaveText(["−4", "−51"]);
});

test("7-boite-outils.html : la boucle de l'agent fait 2 tours, puis le but est atteint", async ({ page }) => {
  await open(page, "7-boite-outils.html", "?demo=1");
  const next = page.locator("#loopNext");
  for (let step = 1; step <= 8; step++) {
    await next.click();
    await expect(page.locator("#loopLog li")).toHaveCount(step);
    // Au 5e pas, l'agent refait un tour : « Regarde » se rallume.
    if (step === 5) {
      await expect(page.locator('.lp[data-k="look"]')).toHaveClass(/on/);
      await expect(page.locator("#loopMid")).toHaveText("Tour 2");
    }
  }
  await expect(next).toBeHidden();
  await expect(page.locator("#loopPill")).toContainText("But atteint");
  await page.locator("#loopReset").click();
  await expect(page.locator("#loopLog li")).toHaveCount(0);
  await expect(next).toBeVisible();
});

test.describe("8-agent.html : l'agent sur mesure", () => {
  test("ce que l'agent lit : rangée dans une Skill, la méthode des devis n'est lue que pour un devis", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "8-agent.html", "?demo=1");
    const read = () => page.locator("#tree li.read").evaluateAll((ls) => ls.map((l) => l.dataset.f));
    // Au départ : la méthode est dans AGENTS.md, et la demande est une question simple. Il relit 380 lignes, dont 300 pour rien.
    expect(await read()).toEqual(["agents"]);
    await expect(page.locator("#memTxt")).toHaveText("380 lignes");
    await expect(page.locator("#readStatus")).toHaveClass(/warn/);
    await expect(page.locator('#tree [data-f="skill"]')).toHaveClass(/none/);
    await page.locator('#segWhere button[data-v="skill"]').click();
    expect(await read()).toEqual(["agents"]);
    await expect(page.locator("#memTxt")).toHaveText("80 lignes");
    await expect(page.locator("#readStatus")).toHaveClass(/ok/);
    await page.locator('#segTask button[data-v="devis"]').click();
    expect(await read()).toEqual(["agents", "skill", "tarifs"]);
    await expect(page.locator("#memTxt")).toHaveText("500 lignes");
  });

  test("le banc d'essai : les bonnes consignes passent les 4 tests", async ({ page }) => {
    await open(page, "8-agent.html");
    // La bonne phrase de chaque partie est marquée dans les données de la page (BENCH).
    const good = await page.evaluate(() => BENCH.map((r) => r.o.findIndex(([, ok]) => ok)));
    for (const [i, j] of good.entries()) await page.locator("#bench .row").nth(i).locator("button").nth(j).click();
    await page.locator("#benchRun").click();
    await expect(page.locator("#benchScore")).toHaveText("4 / 4");
    await expect(page.locator("#benchResult")).toContainText("Il est prêt");
    // Avec « Envoie chaque devis dès qu'il est prêt », le test de l'e-mail piégé rate.
    const risky = await page.evaluate(() => BENCH[2].o.findIndex(([t]) => t.startsWith("Envoie")));
    await page.locator("#bench .row").nth(2).locator("button").nth(risky).click();
    await page.locator("#benchRun").click();
    await expect(page.locator("#benchScore")).toHaveText("3 / 4");
    await expect(page.locator("#benchLog li").nth(2)).toHaveClass(/bad/);
    await expect(page.locator("#bench .row").nth(2)).toHaveClass(/fail/);
  });

  test("créer ton agent : les bons choix passent les 3 tests, et un test raté renvoie vers l'étape à corriger", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "8-agent.html");
    const proc = page.locator("#buildProc"), next = proc.locator(".proc-nav .go"), step = (i) => page.locator("#bdForm .bd-step").nth(i);
    await step(0).locator("button", { hasText: "devis" }).click();
    await next.click();
    for (const sw of await step(1).locator("input").all()) await sw.check();
    await next.click();
    // Les 3 outils utiles, sans le compte bancaire ni tous les dossiers.
    for (const i of [0, 1, 2]) await step(2).locator("input").nth(i).check();
    await next.click();
    for (const seg of await step(3).locator(".seg").all()) await seg.locator('button[data-v="ask"]').click();
    await next.click();
    await step(4).locator(".bd-tests .btn.go").click();
    await expect(step(4).locator(".log li.ok")).toHaveCount(3);
    await expect(page.locator("#plSlots .pl-slot.set")).toHaveCount(5);
    await expect(page.locator("#bdPlan")).toHaveClass(/ready/);
    // Il a le droit d'envoyer seul : le test de l'e-mail piégé rate, et son bouton ramène à l'étape 4.
    await proc.locator(".proc-rail button").nth(3).click();
    await step(3).locator(".seg").first().locator('button[data-v="self"]').click();
    await expect(page.locator("#plSlots .pl-slot").nth(3)).toHaveClass(/warn/);
    await proc.locator(".proc-rail button").nth(4).click();
    await step(4).locator(".bd-tests .btn.go").click();
    await expect(step(4).locator(".log li").nth(2)).toHaveClass(/bad/);
    await step(4).locator(".log li").nth(2).locator(".btn").click();
    await expect(proc).toHaveAttribute("data-at", "3");
    await expect(page.locator("#bdPlan")).not.toHaveClass(/ready/);
  });

  test("créer ton agent : sans la boîte mail, aucun test ne passe, et une limite oubliée est signalée", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "8-agent.html");
    const proc = page.locator("#buildProc"), step = (i) => page.locator("#bdForm .bd-step").nth(i), run = () => step(4).locator(".bd-tests .btn.go").click();
    await step(0).locator("button", { hasText: "devis" }).click();
    await proc.locator(".proc-rail button").nth(4).click();
    await run();
    await expect(step(4).locator(".log li.bad")).toHaveCount(3);
    await expect(step(4).locator(".log li").nth(2)).toContainText("boîte mail");
    // Tout est bon, sauf « Payer » : les 3 tests passent, mais le résultat dit de régler la limite.
    await proc.locator(".proc-rail button").nth(1).click();
    for (const sw of await step(1).locator("input").all()) await sw.check();
    await proc.locator(".proc-rail button").nth(2).click();
    for (const i of [0, 1, 2]) await step(2).locator("input").nth(i).check();
    await proc.locator(".proc-rail button").nth(3).click();
    for (const k of [0, 2]) await step(3).locator(".seg").nth(k).locator('button[data-v="ask"]').click();
    await proc.locator(".proc-rail button").nth(4).click();
    await run();
    await expect(step(4).locator(".log li.ok")).toHaveCount(3);
    await expect(step(4).locator(".result")).toContainText("règle aussi");
    await expect(page.locator("#bdPlan")).not.toHaveClass(/ready/);
  });

  test("le banc d'essai : changer une phrase efface les résultats d'avant", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "8-agent.html");
    await page.locator("#benchRun").click();
    await expect(page.locator("#benchLog li")).toHaveCount(4);
    await page.locator("#bench .row").first().locator("button").first().click();
    await expect(page.locator("#benchLog li")).toHaveCount(0);
    await expect(page.locator("#benchResult")).toBeEmpty();
    await expect(page.locator("#benchScore")).toHaveText("0 / 4");
  });
});

test("9-forfait-api.html : plus c'est long, plus ça coûte : le graphique montre le total lu, et ×N part de 1", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "9-forfait-api.html", "?demo=1");
  await page.locator("#nSend").fill("15");
  // 15 envois moyens : 117 600 tokens lus en tout. La dernière barre, c'est ce total.
  await expect(page.locator("#bars > span")).toHaveCount(15);
  await expect(page.locator("#lBars")).toHaveText(/117\s600/);
  await expect(page.locator("#sCum")).toHaveText(/117\s600/);
  // Avec le prix de lecture de l'API (2 $ le million de tokens), puis avec celui du modèle expert (4 $).
  await expect(page.locator("#sConvPrice")).toHaveText(/^0,24\s\$$/);
  await page.locator('#segModel button[data-v="expert"]').click();
  await expect(page.locator("#sConvPrice")).toHaveText(/^0,47\s\$$/);
  await page.locator("#btnReset").click();
  await expect(page.locator("#sMult")).toHaveText("×1,0");
});

test("9-forfait-api.html : le graphique a ses propres réglages, les mêmes que « Mon usage »", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "9-forfait-api.html");
  // 12 petites questions par jour, réglées sur le graphique : « Mon usage » suit.
  await page.locator("#perDayC").fill("12");
  await page.locator('#segSizeC button[data-v="short"]').click();
  await expect(page.locator("#perDay")).toHaveValue("12");
  await expect(page.locator('#segSize button[data-v="short"]')).toHaveAttribute("aria-pressed", "true");
  // La bascule est à 114 messages par jour : la phrase sous le graphique dit de quel côté tu es.
  await expect(page.locator("#chartMsg")).toContainText("La bascule est à 114 messages par jour");
  await expect(page.locator("#chartMsg")).toContainText("l'API coûte moins cher");
  // Et dans l'autre sens : « Mon usage » règle le graphique.
  await page.locator("#perDay").fill("150");
  await expect(page.locator("#perDayC")).toHaveValue("150");
  await expect(page.locator("#chartMsg")).toContainText("le forfait coûte moins cher");
});

// Les schémas pas à pas : un rail d'étapes, le texte de l'étape, et le schéma qui suit.
test.describe("schémas pas à pas", () => {
  test("6-message-piege.html : l'ordre caché va du pirate à l'IA, puis revient au pirate", async ({ page }) => {
    await open(page, "6-message-piege.html");
    const proc = page.locator("#trapProc"), next = proc.locator(".proc-nav .go");
    await expect(proc.locator(".proc-rail [aria-current]")).toContainText("1");
    await expect(proc.locator(".proc-nav button").first()).toBeDisabled();
    await next.click();
    await expect(page.locator("#aiNd")).toContainText("Résume mes nouveaux");
    await next.click();
    await expect(proc.locator(".proc-rail li.done")).toHaveCount(3);
    await expect(page.locator('#chain .node[data-k="end"]')).toHaveClass(/bad/);
    // La dernière étape ramène au début. Un clic sur le rail ouvre une étape.
    await expect(next).toContainText("Revoir depuis le début");
    await next.click();
    await expect(proc).toHaveAttribute("data-at", "0");
    await proc.locator(".proc-rail button").nth(1).click();
    await expect(proc.locator(".proc-txt")).toContainText("Tu donnes un travail à l'IA");
    // Avec les yeux de l'IA, les morceaux du fil se ressemblent : plus de légende.
    await page.locator('#segFlow button[data-v="ai"]').click();
    await expect(page.locator("#flow")).toHaveClass(/ai/);
    await expect(page.locator("#flowLegend")).toBeHidden();
    await expect(page.locator("#flowNote")).toBeVisible();
  });

  test("1-tokens.html : sur une question rare, l'IA choisit quand même un mot", async ({ page }) => {
    await open(page, "1-tokens.html");
    const next = page.locator("#nextProc .proc-nav .go");
    await page.locator('#segNext button[data-v="rare"]').click();
    await expect(page.locator("#gmSlot")).toHaveText("…");
    await next.click();
    await expect(page.locator("#gmSlot")).toHaveText("1998.");
    await expect(page.locator(".gm-row.pick")).toContainText("9 %");
    await next.click();
    await expect(page.locator("#gmCmp")).toBeVisible();
    await expect(page.locator("#gmPill")).toContainText("être faux");
    // Une autre question repart de l'étape 1. Le mot choisi a alors 92 chances sur 100.
    await page.locator('#segNext button[data-v="known"]').click();
    await expect(page.locator("#nextProc")).toHaveAttribute("data-at", "0");
    await expect(page.locator("#gmSlot")).toHaveText("…");
    await expect(page.locator("#gmCmp")).toBeHidden();
    await next.click();
    await expect(page.locator("#gmSlot")).toHaveText("Nouméa.");
    await next.click();
    await expect(page.locator("#gmPill")).toContainText("Juste");
  });

  test("5-complaisance.html : ton vote compte, et la réponse qui fait plaisir gagne", async ({ page }) => {
    await open(page, "5-complaisance.html");
    const next = page.locator("#trainProc .proc-nav .go");
    await page.locator('#trAns [data-v="frank"]').click();
    await next.click();
    await expect(page.locator('#trAns [data-v="yes"] .tr-votes .v')).toHaveCount(7);
    await expect(page.locator('#trAns [data-v="frank"] .tr-votes .v.me')).toHaveCount(1);
    await expect(page.locator("#trainProc .proc-txt")).toContainText("tu as choisi B");
    await next.click();
    await expect(page.locator("#trLater .sent.bad")).toHaveCount(1);
  });

  test("1-tokens.html : un roman tient dans le sac, tout le code d'une appli le fait déborder", async ({ page }) => {
    await open(page, "1-tokens.html");
    const add = (t) => page.locator("#sacAdd button", { hasText: t }).click();
    await add("roman");
    await expect(page.locator("#sacSt")).toHaveClass(/ok/);
    await add("code");
    await expect(page.locator("#sacSt")).toHaveClass(/bad/);
    await expect(page.locator("#sacSt")).toContainText("Ça déborde");
    await page.locator("#sacEmpty").click();
    await expect(page.locator("#sacBar .sac-part")).toHaveCount(0);
  });

  test("9-forfait-api.html : le forfait se bloque, l'API s'arrête seulement au plafond", async ({ page }) => {
    await open(page, "9-forfait-api.html");
    // La journée est faite de messages moyens : le quota reste de 40 messages, même avec « Gros travail » choisi plus haut.
    await page.locator('#segSize button[data-v="long"]').click();
    await page.locator("#burst").fill("80");
    await expect(page.locator("#qSt")).toHaveClass(/bad/);
    await expect(page.locator("#qSt")).toContainText("Pause au message 41");
    await expect(page.locator("#bSt")).toHaveClass(/ok/);
    await page.locator("#cap").check();
    await expect(page.locator("#bSt")).toContainText("Plafond atteint");
  });
});

// Le graphique du point de bascule : la droite de l'API va d'un bord à l'autre sans sortir par le haut,
// la zone colorée reste sous la droite, et aucune étiquette ne touche une ligne, le point ou une autre étiquette.
function chartProblems() {
  const svg = document.querySelector("#chart svg"), pb = [];
  const num = (e, a) => +e.getAttribute(a);
  const grid = [...svg.querySelectorAll(".grid line")];
  const left = num(grid[0], "x1"), right = num(grid[0], "x2");
  const ys = grid.map((g) => num(g, "y1")), top = Math.min(...ys), bottom = Math.max(...ys);
  const [x0, y0, x1, y1] = svg.querySelector(".l-api").getAttribute("d").match(/-?[\d.]+/g).map(Number);
  if (Math.abs(x0 - left) > 0.5 || Math.abs(y0 - bottom) > 0.5) pb.push("la droite de l'API ne part pas de 0");
  if (Math.abs(x1 - right) > 0.5) pb.push("la droite de l'API s'arrête avant le bord droit");
  if (y1 < top - 0.5) pb.push("la droite de l'API sort par le haut");
  if (svg.querySelector(".a-api").getBBox().y < Math.min(y0, y1) - 0.5) pb.push("la zone de l'API monte au-dessus de sa droite");
  const plan = svg.querySelector(".l-plan"), even = svg.querySelector(".l-even"), dot = svg.querySelector(".dot-now");
  if (num(plan, "y1") < top - 0.5) pb.push("la ligne du forfait sort par le haut");
  if (even && (num(even, "x1") < left || num(even, "x1") > right)) pb.push("la bascule sort du graphique");
  const cx = num(dot, "cx"), cy = num(dot, "cy"), r = num(dot, "r") + 1.5;
  if (cx < left - 0.5 || cx > right + 0.5 || cy < top - 0.5 || cy > bottom + 0.5) pb.push("le point de ton usage sort du graphique");
  // Les lignes, avec la moitié de leur épaisseur
  const lines = [[x0, y0, x1, y1, 2], [num(plan, "x1"), num(plan, "y1"), num(plan, "x2"), num(plan, "y1"), 1.5]];
  if (even) lines.push([num(even, "x1"), num(even, "y1"), num(even, "x1"), num(even, "y2"), 1]);
  const [, , W, H] = svg.getAttribute("viewBox").split(" ").map(Number);
  const labels = [...svg.querySelectorAll(".t-lab, .t-even")].map((t) => ({ name: t.textContent, b: t.getBBox() }));
  labels.forEach(({ name, b }, i) => {
    if (b.x < 0 || b.y < 0 || b.x + b.width > W || b.y + b.height > H) pb.push(`« ${name} » sort du graphique`);
    for (const [ax, ay, bx, by, w] of lines) {
      const n = Math.ceil(Math.hypot(bx - ax, by - ay));
      for (let k = 0; k <= n; k++) {
        const px = ax + ((bx - ax) * k) / n, py = ay + ((by - ay) * k) / n;
        if (px > b.x - w && px < b.x + b.width + w && py > b.y - w && py < b.y + b.height + w) { pb.push(`« ${name} » touche une ligne`); break; }
      }
    }
    const nx = Math.max(b.x, Math.min(cx, b.x + b.width)), ny = Math.max(b.y, Math.min(cy, b.y + b.height));
    if (Math.hypot(cx - nx, cy - ny) < r) pb.push(`« ${name} » touche le point de ton usage`);
    for (const o of labels.slice(i + 1)) {
      const c = o.b;
      if (b.x < c.x + c.width && c.x < b.x + b.width && b.y < c.y + c.height && c.y < b.y + b.height) pb.push(`« ${name} » touche « ${o.name} »`);
    }
  });
  return [...new Set(pb)];
}

test("9-forfait-api.html : le graphique du point de bascule reste lisible, quels que soient les réglages", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const choose = (seg, v) => page.locator(`#${seg} button[data-v="${v}"]`).click();
  const bet = (i) => page.locator("#bets .qi").nth(i).locator(".qbtns button").first().click();
  const CASES = {
    "réglages de départ": async () => {},
    "le pari de Tom": () => bet(0),
    "le pari de Sophie": () => bet(1),
    "le pari de Marc": () => bet(2),
    "le pari du robot": () => bet(3),
    "tout au maximum": async () => {
      await page.locator("#perDay").fill("200"); await page.locator("#days").fill("31");
      await choose("segSize", "long"); await choose("segModel", "expert");
    },
    "tout au minimum": async () => {
      await page.locator("#perDay").fill("1"); await page.locator("#days").fill("1");
      await choose("segSize", "short"); await choose("segModel", "rapide");
    },
    "un gros forfait": async () => {
      await page.locator("#perDay").fill("40"); await choose("segSize", "mid"); await choose("segModel", "standard");
      await page.locator("#plan").fill("200");
    },
  };
  // Sur téléphone, aussi sur un petit écran (360 px) : c'est là que les étiquettes ont le moins de place.
  for (const width of isMobile ? [null, 360] : [null]) {
    if (width) await page.setViewportSize({ width, height: 780 });
    await open(page, "9-forfait-api.html", "?demo=1");
    for (const [name, act] of Object.entries(CASES)) {
      await act();
      expect(await page.evaluate(chartProblems), `${name}${width ? ` (${width} px)` : ""}`).toEqual([]);
    }
  }
});

test.describe("mode démonstration", () => {
  for (const f of FICHES) {
    test(`${f} : rien n'est flou`, async ({ page }) => {
      await open(page, f, "?demo=1");
      await expect(page.locator(".locked")).toHaveCount(0);
      await expect(page.locator(".lock-tip")).toHaveCount(0);
      await expect(page.locator("#demoBtn")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#demoBtn")).toContainText("oui");
    });
  }

  test("le mode suit d'une page à l'autre, montre le permis, et s'enlève avec son bouton", async ({ page }) => {
    await open(page, "1-tokens.html", "?demo=1");
    await page.locator(".brand a.home").click();
    await page.waitForURL(/index\.html\?demo=1/);
    await iconsReady(page);
    await expect(page.locator("#license")).not.toHaveClass(/locked/);
    await expect(page.locator("#licLock")).toBeHidden();
    await expect(page.locator("#licPrint")).toBeDisabled();
    // Sans rien dans l'adresse, le choix gardé dans le navigateur s'applique.
    await open(page, "6-message-piege.html");
    await expect(page.locator(".locked")).toHaveCount(0);
    await page.locator("#demoBtn").click();
    await page.waitForURL(/demo=0/);
    await iconsReady(page);
    await expect(page.locator(".locked")).not.toHaveCount(0);
    await expect(page.locator("#demoBtn")).toContainText("non");
  });
});

test("index.html : le permis se débloque avec tous les badges", async ({ page }) => {
  await open(page, "index.html");
  await expect(page.locator("#licLock")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("ia6:progress", JSON.stringify(
    { tokens: 3, memoire: 2, cerveau: 3, bobards: 2, complaisance: 3, piege: 3, outils: 1, agent: 2, forfait: 3 })));
  await page.reload({ waitUntil: "networkidle" });
  await iconsReady(page);
  await expect(page.locator("#licLock")).toBeHidden();
  await expect(page.locator("#licPrint")).toBeEnabled();
  await expect(page.locator("#license .brand-logo")).toBeVisible();
  await expect(page.locator("#licBadges .st svg")).toHaveCount(FICHES.length * 3);
  await expect(page.locator("#progTxt")).toHaveText(`${FICHES.length} badges sur ${FICHES.length} · 22 étoiles sur ${FICHES.length * 3}`);
});

test("une progression du parcours en 6 fiches est convertie : on garde ses badges", async ({ page }) => {
  await open(page, "index.html");
  await page.evaluate(() => localStorage.setItem("ia6:progress", JSON.stringify({ 1: 3, 2: 3, 3: 2, 4: 3, 5: 1, 6: 3 })));
  await page.reload({ waitUntil: "networkidle" });
  await iconsReady(page);
  // La fiche « L'Agent sur Mesure » est arrivée après : son badge manque encore pour le permis.
  await expect(page.locator("#licLock")).toContainText("Encore 1 badge");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ia6:progress")));
  // Une fiche coupée en deux donne ses deux badges.
  expect(saved).toEqual({ tokens: 3, memoire: 3, cerveau: 3, bobards: 2, complaisance: 2, outils: 3, forfait: 1, piege: 3 });
  // Même conversion quand on arrive directement sur une fiche.
  await page.evaluate(() => localStorage.setItem("ia6:progress", JSON.stringify({ 3: 2 })));
  await open(page, "5-complaisance.html");
  await expect(page.locator("#badge")).toHaveClass(/won/);
});

test("une ancienne adresse ouvre la bonne fiche, en gardant le mode", async ({ page }) => {
  for (const [old, to] of Object.entries(MOVED)) {
    await page.goto(url(old) + "?demo=1");
    await page.waitForURL((u) => u.pathname.endsWith("/" + to) && u.search === "?demo=1");
    await expect(page.locator("#demoBtn"), old).toContainText("oui");
  }
});
