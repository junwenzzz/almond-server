// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Almond
//
// Copyright 2016-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>

import express from 'express';

import { ServerPlatform } from '../service/platform';
import * as user from '../util/user';

import conversationHandler from './conversation';

const router = express.Router();

router.get('/', user.requireLogIn, (req, res, next) => {
    res.render('forge_viewer', { page_title: req._("CIFE Forge Viewer") });
});

router.use('/ws/conversation', (req, res, next) => {
    const compareTo = req.app.genie.platform.getOrigin();
    if (req.headers.origin && req.headers.origin !== compareTo) {
        res.status(403).send('Forbidden Cross Origin Request');
        return;
    }

    next();
}, user.requireLogIn);
router.ws('/ws/conversation', conversationHandler);

router.get('/listen', user.requireLogIn, (req, res, next) => {
    res.render('listen', {
        page_title: req._("Genie - Listen"),
        csrfToken: req.csrfToken()
    });
});

router.post('/listen', user.requireLogIn, (req, res, next) => {
    const engine = req.app.genie;
    const platform = engine.platform as ServerPlatform;

    platform.speech!.wakeword();
    res.render('listen', {
        page_title: req._("Genie - Listen"),
        csrfToken: req.csrfToken()
    });
});

export default router;
