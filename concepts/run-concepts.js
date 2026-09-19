/**

 * Visual theme previews: 8091–8099, 8100–8103 (Psycho-Pass set).

 */

const express = require('express');

const path = require('path');



const ROOT = __dirname;

const shared = path.join(ROOT, 'shared');



const concepts = [

  { port: 8091, dir: 'concept-a-void-cathedral', label: 'Neural Terminal' },

  { port: 8092, dir: 'concept-b-funeral-parlor-hud', label: 'Crystal Cathedral' },

  { port: 8093, dir: 'concept-d-sakura-genome', label: 'Sakura Genome' },

  { port: 8094, dir: 'concept-e-void-opera', label: 'Void Opera' },

  { port: 8095, dir: 'concept-m-sibyl-index', label: 'Sibyl Index' },

  { port: 8096, dir: 'concept-h-lost-christmas', label: 'Lost Christmas' },

  { port: 8097, dir: 'concept-i-apocalypse-ring', label: 'Apocalypse Ring' },

  { port: 8098, dir: 'concept-k-sublevel-zero', label: 'Sublevel Zero' },

  { port: 8119, dir: 'concept-l-seraph-static', label: 'Seraph Static' },

  { port: 8120, dir: 'concept-n-dominator-lock', label: 'Dominator Lock' },

  { port: 8122, dir: 'concept-o-mwpsb-dossier', label: 'MWPSB Dossier' },

  { port: 8102, dir: 'concept-p-hue-spectrum', label: 'Hue Spectrum' },

  { port: 8103, dir: 'concept-q-makishima-shelf', label: 'Makishima Shelf' },

];



for (const c of concepts) {

  const app = express();

  const conceptRoot = path.join(ROOT, c.dir);

  app.use('/data', express.static(path.join(shared, 'data')));

  app.use('/shared', express.static(shared));

  app.use(express.static(conceptRoot));

  app.listen(c.port, '127.0.0.1', () => {

    console.log(`${c.label}: http://127.0.0.1:${c.port}`);

  });

}


