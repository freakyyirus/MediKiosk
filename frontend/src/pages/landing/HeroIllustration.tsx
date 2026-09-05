/**
 * Hero scene — premium medical-editorial illustration.
 *
 * An Indian patient explains her symptoms into a kiosk mic (left); soft sound
 * waves carry "chest pain..." to a small clinical note, which flows toward a
 * real doctor holding a tablet with a structured summary (right). Natural human
 * proportions, believable hands and faces, muted pastel palette that blends
 * into the lavender hero background. Transparent backdrop — no container, no
 * border, artwork sits directly on the existing soft mesh.
 *
 * Static on purpose (wrapper owns the gentle float); 16:9 to match the layout.
 */
export default function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-full ${className}`}
      role="img"
      aria-label="A patient speaks into a hospital kiosk microphone; her chest-pain complaint is captured as a note and received by a doctor's tablet."
    >
      <svg viewBox="0 0 1600 900" className="w-full h-auto overflow-visible" aria-hidden="true">
        <defs>
          {/* soft light pastel washes — kept barely visible so the hero mesh stays primary */}
          <linearGradient id="kurta" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6173A6" />
            <stop offset="100%" stopColor="#4E5F92" />
          </linearGradient>
          <linearGradient id="coat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBFAF7" />
            <stop offset="100%" stopColor="#EEECE6" />
          </linearGradient>
          <linearGradient id="sleeveShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C88F62" />
            <stop offset="100%" stopColor="#B27B50" />
          </linearGradient>
          <filter id="smshadow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="9" stitchTiles="stitch" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.45 0.42 0.5 0 0" result="m" />
            <feComponentTransfer in="m"><feFuncA type="linear" slope="0.05" /></feComponentTransfer>
          </filter>
        </defs>

        {/* ==================== AMBIENT ==================== */}
        {/* a few far pastel washes for depth (no hard shapes) */}
        <circle cx="880" cy="360" r="230" fill="#E6E2F7" opacity="0.3" filter="url(#smshadow)" />
        <circle cx="160" cy="760" r="200" fill="#EAF2EE" opacity="0.35" filter="url(#smshadow)" />
        <circle cx="1460" cy="720" r="210" fill="#F7E9E1" opacity="0.3" filter="url(#smshadow)" />
        {/* ground line + soft shadows */}
        <path d="M0 850 H1600" stroke="#C9D2EC" strokeWidth="1.5" opacity="0.6" />

        {/* ==================== PATIENT ==================== */}
        <g>
          <ellipse cx="412" cy="852" rx="120" ry="11" fill="#5A678A" opacity="0.12" filter="url(#smshadow)" />

          {/* legs (churidar) */}
          <path d="M352 640 C350 694 352 780 356 822 C372 824 390 824 398 826 C396 782 394 696 392 640 Z" fill="#4A5A8A" />
          <path d="M418 640 C420 700 424 786 428 824 C442 822 460 822 468 820 C466 776 462 694 460 640 Z" fill="#4A5A8A" />
          {/* feet + chappals */}
          <ellipse cx="368" cy="844" rx="16" ry="6" fill="#E8D7BF" />
          <path d="M354 844 L368 840 L382 844" stroke="#C98F62" strokeWidth="2" fill="none" />
          <ellipse cx="452" cy="846" rx="16" ry="6" fill="#E8D7BF" />

          {/* kurta */}
          <path d="M330 512 C350 500 380 496 405 494 C430 496 460 500 480 512 C486 556 490 604 492 640 C384 648 352 648 318 640 C322 602 324 556 330 512 Z" fill="url(#kurta)" />
          {/* side shading */}
          <path d="M322 520 C320 566 318 604 318 640 L340 640 C336 600 336 556 332 518 Z" fill="#3E4E7E" opacity="0.35" />
          <path d="M488 520 C490 566 491 604 492 640 L472 640 C474 600 476 556 480 518 Z" fill="#3E4E7E" opacity="0.35" />
          {/* V neckline w/ piping */}
          <path d="M396 502 L405 522 L414 502" stroke="#C77E5F" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M376 520 C386 526 424 526 434 520" stroke="#3E4E7E" strokeWidth="2" opacity="0.5" fill="none" />

          {/* left arm + hand */}
          <g>
            <path d="M330 512 C322 542 314 558 300 566 L294 594 C306 598 320 598 330 594 L330 512 Z" fill="url(#kurta)" />
            <path d="M296 578 C292 594 291 606 290 614" stroke="url(#sleeveShade)" strokeWidth="17" strokeLinecap="round" fill="none" />
            {/* hanging hand — palm + believable fingers */}
            <circle cx="290" cy="622" r="9.5" fill="#C98F63" />
            <path d="M284 628 Q290 634 296 628" stroke="#A97147" strokeWidth="2" fill="none" />
            <path d="M286 633 Q289 636 292 633" stroke="#A97147" strokeWidth="1.6" fill="none" />
            <path d="M289 634 Q291 637 293 634" stroke="#A97147" strokeWidth="1.6" fill="none" />
            <path d="M295 620 Q300 616 301 624 Q302 630 295 628" stroke="#A97147" strokeWidth="2" fill="none" />
            {/* thumb */}
            <path d="M283 620 Q277 618 277 624" stroke="#C98F63" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </g>

          {/* dupatta draped over left shoulder */}
          <g>
            <path d="M330 516 C346 526 352 540 354 556 C348 590 340 618 332 640 C320 610 315 558 315 520 Z" fill="#DEA183" opacity="0.94" />
            <path d="M352 544 C344 582 338 614 334 640" stroke="#C9825F" strokeWidth="2.5" opacity="0.7" fill="none" />
            <path d="M318 518 C328 534 340 544 352 548" stroke="#C9825F" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
          </g>

          {/* right arm — reaching toward mic */}
          <g>
            <path d="M478 514 C492 534 504 548 516 556 L528 570 C520 580 514 586 508 592 L480 512 Z" fill="url(#kurta)" />
            <path d="M514 556 C536 548 557 528 572 506" stroke="url(#sleeveShade)" strokeWidth="19" strokeLinecap="round" fill="none" />
            <circle cx="510" cy="548" r="5" fill="#B27B50" opacity="0.5" />
          </g>

          {/* neck */}
          <rect x="396" y="450" width="21" height="26" rx="9" fill="url(#sleeveShade)" />
          <path d="M402 462 C400 468 400 474 401 478" stroke="#9A6B45" strokeWidth="2" opacity="0.5" fill="none" />

          {/* head + face */}
          <g transform="rotate(-2 405 424)">
            {/* face */}
            <path d="M376 428 C374 398 388 384 405 384 C422 384 436 398 434 428 C433 452 426 464 405 468 C384 464 377 452 376 428 Z" fill="#C88F62" />
            {/* soft right-side shading */}
            <path d="M405 388 C420 390 430 402 431 422 C430 444 421 460 405 465 C414 460 420 448 421 428 C420 406 413 394 404 390 Z" fill="#B07A50" opacity="0.4" />
            {/* ears */}
            <ellipse cx="374" cy="434" rx="5" ry="8" fill="#BE8657" />
            <ellipse cx="436" cy="434" rx="5" ry="8" fill="#BE8657" />
            <circle cx="368" cy="437" r="2.2" fill="#C9A24B" />
            <circle cx="442" cy="437" r="2.2" fill="#C9A24B" />
            {/* hair — parted, into a bun */}
            <circle cx="424" cy="398" r="12" fill="#332A24" />
            <path d="M374 422 C372 396 388 380 405 380 C422 380 438 396 436 422 C433 396 420 388 405 388 C390 388 377 396 374 422 Z" fill="#332A24" />
            <path d="M377 420 C370 448 364 468 357 480 C366 471 374 452 378 428 Z" fill="#332A24" />
            <path d="M435 420 C441 448 446 468 452 480 C444 471 436 452 433 428 Z" fill="#332A24" />
            {/* brows */}
            <path d="M383 426 Q392 422 401 426" stroke="#3E2B1E" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M409 426 Q418 422 427 426" stroke="#3E2B1E" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* eyes — explaining, calm */}
            <path d="M383 438 Q392 430 401 438 Q392 447 383 438 Z" fill="#FBEFE2" />
            <path d="M409 438 Q418 430 427 438 Q418 447 409 438 Z" fill="#FBEFE2" />
            <circle cx="392" cy="437" r="5" fill="#3E3226" />
            <circle cx="418" cy="437" r="5" fill="#3E3226" />
            <circle cx="393.4" cy="435.6" r="1.6" fill="#FFF6EC" />
            <circle cx="419.4" cy="435.6" r="1.6" fill="#FFF6EC" />
            <path d="M382 437 Q392 428 402 437" stroke="#4A3226" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M408 437 Q418 428 428 437" stroke="#4A3226" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M386 444 Q392 447 397 443" stroke="#4A3226" strokeWidth="1.4" opacity="0.7" fill="none" />
            <path d="M413 444 Q418 447 424 443" stroke="#4A3226" strokeWidth="1.4" opacity="0.7" fill="none" />
            {/* nose */}
            <path d="M406 434 C407 442 408 449 411 452" stroke="#9A6B45" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M409 450 C411 450 413 449 414 447" stroke="#9A6B45" strokeWidth="1.6" fill="none" />
            {/* mouth — speaking */}
            <path d="M396 460 Q405 466 414 460 Q405 470 396 460 Z" fill="#7E4032" />
            <path d="M396 460 Q405 454 414 460" stroke="#8A4A38" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d="M401 468 Q405 471 409 468" stroke="#A97147" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            {/* chin + under-jaw soft shading */}
            <path d="M396 468 C402 473 408 473 414 468" stroke="#A97147" strokeWidth="2" opacity="0.5" fill="none" />
          </g>

          {/* kiosk microphone */}
          <g>
            <ellipse cx="615" cy="850" rx="14" ry="5" fill="#3E4450" />
            <path d="M615 848 V572" stroke="#59606E" strokeWidth="9" strokeLinecap="round" />
            <path d="M615 578 C615 552 600 540 588 528" stroke="#59606E" strokeWidth="8" strokeLinecap="round" fill="none" />
            {/* mic capsule — right hand wraps it */}
            <rect x="572" y="502" width="30" height="27" rx="13" fill="#464E5C" />
            <path d="M578 508 H596 M578 513.5 H596 M578 519 H596" stroke="#333945" strokeWidth="1.4" opacity="0.7" />
            <circle cx="587" cy="514" r="1.8" fill="#14B8A6" />
            {/* right hand — fingers gripping */}
            <g>
              <path d="M566 506 C558 502 552 508 554 516" stroke="url(#sleeveShade)" strokeWidth="15" strokeLinecap="round" fill="none" />
              <path d="M574 498 C579 493 583 494 586 499 L585 506 C581 501 577 500 574 503 Z" fill="#C98F63" />
              <path d="M586 499 L586 507" stroke="#A97147" strokeWidth="1.6" />
              <path d="M575 499 C579 497 582 498 583 502 L582 508 C578 504 576 503 573 505 Z" fill="#C98F63" />
              <path d="M577 504 L576 510" stroke="#A97147" strokeWidth="1.6" />
              <path d="M570 502 C573 500 575 502 576 506 L575 510 C572 508 571 507 569 508 Z" fill="#C98F63" />
              <ellipse cx="567" cy="519" rx="6" ry="9" fill="#C98F63" />
            </g>
          </g>
        </g>

        {/* ==================== SOUND + NOTE + FLOW ==================== */}
        <g>
          {/* subtle sound-wave ribbons from her mouth toward the note */}
          <path d="M512 446 C556 430 592 412 616 392" stroke="#DEA183" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M506 458 C552 446 588 430 618 410" stroke="#8B9BD6" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.45" />
          <path d="M514 470 C550 476 580 474 606 466" stroke="#DEA183" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.3" />

          {/* small clinical note — subtle, integrated */}
          <g transform="rotate(-2 820 352)">
            <rect x="702" y="324" width="236" height="66" rx="12" fill="#6173A6" opacity="0.14" filter="url(#smshadow)" />
            <rect x="702" y="318" width="236" height="66" rx="12" fill="#FFFFFF" opacity="0.92" stroke="#E2E7F7" strokeWidth="1.5" />
            <path d="M818 330 L818 372" stroke="#EEEFF9" strokeWidth="1.5" />
            <text
              x="822"
              y="362"
              textAnchor="middle"
              fontSize="33"
              fontWeight="500"
              fontStyle="italic"
              fill="#46408F"
              fontFamily="Caveat, 'Segoe Script', cursive"
            >
              chest pain…
            </text>
            <path d="M742 372 C776 367 810 371 844 368 C878 366 902 369 916 372" stroke="#DEA183" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />
          </g>

          {/* flow toward the tablet */}
          <path d="M938 348 C1010 400 1084 448 1152 486" stroke="#9BA7D6" strokeWidth="2" strokeDasharray="6 6" fill="none" strokeLinecap="round" opacity="0.6" />
          <circle cx="1162" cy="493" r="4" fill="#8B9BD6" opacity="0.8" />
        </g>

        {/* ==================== DOCTOR ==================== */}
        <g>
          <ellipse cx="1238" cy="852" rx="128" ry="11" fill="#5A678A" opacity="0.12" filter="url(#smshadow)" />

          {/* legs + shoes */}
          <path d="M1174 690 C1172 742 1170 784 1168 812 C1186 816 1204 816 1216 814 C1216 780 1214 730 1214 690 Z" fill="#4A4F5E" />
          <path d="M1250 690 C1256 742 1262 784 1266 812 C1280 810 1298 810 1308 808 C1304 776 1300 726 1296 690 Z" fill="#4A4F5E" />
          <ellipse cx="1186" cy="844" rx="15" ry="6" fill="#3A3E49" />
          <ellipse cx="1298" cy="844" rx="15" ry="6" fill="#3A3E49" />

          {/* white coat */}
          <path d="M1152 512 C1170 500 1200 496 1235 494 C1270 496 1300 500 1318 512 C1324 560 1328 630 1328 692 C1256 700 1214 700 1142 692 C1146 630 1146 560 1152 512 Z" fill="url(#coat)" />
          {/* coat shading + seams */}
          <path d="M1148 520 C1144 566 1142 630 1142 692 L1164 692 C1162 628 1164 566 1166 520 Z" fill="#C9C4B8" opacity="0.25" />
          <path d="M1322 520 C1326 566 1328 630 1328 692 L1306 692 C1308 628 1310 566 1312 520 Z" fill="#C9C4B8" opacity="0.25" />
          <path d="M1202 528 L1235 636 L1268 528" fill="#F0EEE8" stroke="#D9D4C6" strokeWidth="1.5" />
          <path d="M1206 530 L1235 632 L1264 530" fill="#F8F7F3" />
          {/* inner shirt + tie */}
          <path d="M1214 502 L1235 540 L1256 502 L1256 560 L1214 560 Z" fill="#DCE6F3" />
          <path d="M1224 528 L1235 596 L1246 528 Z" fill="#5660A0" />
          {/* buttons */}
          <circle cx="1235" cy="652" r="2.6" fill="#B4AC9C" />
          <circle cx="1235" cy="674" r="2.6" fill="#B4AC9C" />
          {/* stethoscope */}
          <g>
            <circle cx="1204" cy="516" r="4" fill="#7A8291" />
            <circle cx="1266" cy="516" r="4" fill="#7A8291" />
            <path d="M1206 512 C1212 500 1226 494 1235 494 C1244 494 1258 500 1264 512" stroke="#67707F" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M1208 526 C1201 536 1200 552 1207 564 C1212 572 1220 576 1226 578 L1232 592" stroke="#67707F" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <circle cx="1234" cy="598" r="8" fill="none" stroke="#8B93A2" strokeWidth="3.5" />
            <circle cx="1234" cy="598" r="3" fill="#464E5C" />
          </g>
          {/* ID badge */}
          <g transform="translate(1264 562)">
            <path d="M0 0 H14 V11 L7 8.5 L0 11 Z" fill="#EEF0FB" stroke="#C6CDF0" strokeWidth="1.2" />
            <circle cx="4.5" cy="3" r="1.8" fill="#4F46E5" opacity="0.6" />
            <path d="M8 2.5 H13 M8 4.5 H12" stroke="#C6CDF0" strokeWidth="1" />
          </g>

          {/* tablet held naturally with both hands */}
          <g transform="rotate(3 1245 540)">
            <rect x="1166" y="476" width="158" height="128" rx="14" fill="#33373F" />
            <rect x="1174" y="484" width="142" height="112" rx="8" fill="#F7FAFF" />
            {/* header */}
            <circle cx="1186" cy="496" r="2.4" fill="#4FB59A" />
            <text x="1194" y="499" fontSize="9" fontWeight="700" fill="#6A7194" fontFamily="Inter, sans-serif" letterSpacing="0.4">MEDIKIOSK · SUMMARY</text>
            <rect x="1280" y="489" width="30" height="13" rx="6.5" fill="#EF7E5C" />
            <text x="1295" y="498.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#FFFFFF" fontFamily="Inter, sans-serif">URGENT</text>
            <path d="M1178 512 H1312" stroke="#E6E9F4" strokeWidth="1" />
            {/* structured fields */}
            <text x="1182" y="526" fontSize="7" fill="#9AA0B8" fontFamily="Inter, sans-serif" letterSpacing="0.3">CHIEF COMPLAINT</text>
            <text x="1182" y="538" fontSize="11" fontWeight="600" fill="#2E3650" fontFamily="Inter, sans-serif">Chest pain (retrosternal)</text>
            <text x="1182" y="552" fontSize="7" fill="#9AA0B8" fontFamily="Inter, sans-serif" letterSpacing="0.3">ONSET</text>
            <text x="1182" y="563" fontSize="10" fontWeight="500" fill="#3A4460" fontFamily="Inter, sans-serif">About 2 hours ago · sudden</text>
            <text x="1182" y="577" fontSize="9" fontWeight="600" fill="#44506E" fontFamily="Inter, sans-serif">BP 150/94 · HR 96 · SpO₂ 98%</text>
            {/* fhir badge */}
            <path d="M1252 580 h8 a4 4 0 0 1 4 4 v0 a4 4 0 0 1 -4 4 h-8 a4 4 0 0 1 -4 -4 v0 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#A9B4E8" strokeWidth="1" />
            <circle cx="1257" cy="582" r="1" fill="#4F46E5" />
            <text x="1262" y="589" fontSize="7" fill="#646EB4" fontFamily="Inter, sans-serif">FHIR R4</text>
          </g>

          {/* hands — believable grips */}
          <g>
            {/* left hand supporting bottom */}
            <path d="M1160 600 C1148 606 1146 618 1154 626" stroke="url(#sleeveShade)" strokeWidth="17" strokeLinecap="round" fill="none" />
            <ellipse cx="1168" cy="612" rx="8" ry="10" fill="#C98F63" transform="rotate(-18 1168 612)" />
            <path d="M1162 618 Q1168 622 1174 618" stroke="#A97147" strokeWidth="1.6" fill="none" />
            <path d="M1165 621 Q1168 624 1171 621" stroke="#A97147" strokeWidth="1.6" fill="none" />
            <path d="M1172 618 L1176 612" stroke="#A97147" strokeWidth="1.6" />
            {/* right hand on edge */}
            <path d="M1324 556 C1334 560 1342 566 1348 574 L1336 586 C1330 578 1324 572 1320 566 Z" stroke="url(#sleeveShade)" strokeWidth="16" strokeLinecap="round" fill="none" />
            <path d="M1338 574 C1343 570 1346 568 1348 572 C1350 580 1348 592 1344 600 C1338 604 1332 604 1328 600 C1322 594 1320 584 1322 578" fill="#C98F63" />
            <path d="M1334 588 L1330 598" stroke="#A97147" strokeWidth="1.6" />
            <path d="M1332 590 L1328 600" stroke="#A97147" strokeWidth="1.6" />
            <path d="M1336 596 L1334 602" stroke="#A97147" strokeWidth="1.6" />
          </g>

          {/* head — turned slightly toward the patient */}
          <g transform="rotate(2 1235 424)">
            {/* face */}
            <path d="M1206 428 C1204 398 1218 384 1235 384 C1252 384 1266 398 1264 428 C1263 452 1256 464 1235 468 C1214 464 1207 452 1206 428 Z" fill="#C98F63" />
            {/* subtle shading — lit from far window left */}
            <path d="M1235 388 C1250 390 1260 402 1261 422 C1260 444 1250 460 1235 465 C1244 460 1250 448 1251 428 C1250 406 1243 394 1234 390 Z" fill="#B07A50" opacity="0.35" />
            {/* ear (right side visible as he faces left) */}
            <ellipse cx="1202" cy="434" rx="5" ry="8" fill="#BE8657" />
            {/* hair — short, neat */}
            <path d="M1204 424 C1202 394 1218 380 1235 380 C1252 380 1268 394 1266 424 C1262 398 1250 390 1235 390 C1220 390 1208 398 1204 424 Z" fill="#322C26" />
            <path d="M1206 420 C1202 438 1200 452 1198 464 C1208 458 1216 444 1218 426 Z" fill="#322C26" />
            {/* soft jaw stubble hint */}
            <path d="M1214 460 C1228 470 1244 470 1257 462" stroke="#A97147" strokeWidth="2.5" opacity="0.18" fill="none" />
            {/* brows — gently attentive */}
            <path d="M1213 416 Q1222 412 1231 416" stroke="#3E2B1E" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M1240 416 Q1248 412 1256 416" stroke="#3E2B1E" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* eyes — gaze toward patient */}
            <path d="M1209 439 Q1218 431 1227 439 Q1218 448 1209 439 Z" fill="#FBEFE2" />
            <path d="M1240 439 Q1248 432 1256 439 Q1248 447 1240 439 Z" fill="#FBEFE2" />
            <circle cx="1216" cy="438" r="4.6" fill="#3E3226" />
            <circle cx="1245" cy="438" r="4.2" fill="#3E3226" />
            <circle cx="1215" cy="438.5" r="1.5" fill="#FFF6EC" />
            <circle cx="1244" cy="438.5" r="1.4" fill="#FFF6EC" />
            <path d="M1208 438 Q1218 429 1228 438" stroke="#4A3226" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            <path d="M1240 438 Q1248 430 1258 438" stroke="#4A3226" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            {/* nose */}
            <path d="M1233 434 C1230 442 1226 448 1220 451" stroke="#9A6B45" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* mouth — calm, professional */}
            <path d="M1220 460 Q1228 466 1237 460" stroke="#98563E" strokeWidth="2.3" strokeLinecap="round" fill="none" />
            <path d="M1224 465 Q1228 468 1233 465" stroke="#A97147" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        </g>

        {/* ==================== SUBTLE EDITORIAL GRAIN ==================== */}
        <rect x="0" y="0" width="1600" height="900" filter="url(#grain)" style={{ mixBlendMode: 'multiply' }} />
      </svg>
    </div>
  );
}