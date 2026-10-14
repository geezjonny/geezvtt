import OBR from 'https://esm.sh/@owlbear-rodeo/sdk@3.1.0';
import {startVision} from './vision.js';
OBR.onReady(()=>startVision(OBR));
