

var customCSS = `
.not-hidden {
    display: block;
}
.btn-build.current-quest {
    min-width: 0;
    padding: 3px 9px;
    background: linear-gradient(to bottom, #0bac00 0%,#0e7a1e 100%);
}
.btn-build.current-quest:hover {
    background: linear-gradient(to bottom, #13c600 0%,#129e23 100%);
}

#toggleButton.toggle-on {
    background-color: green;
}

#toggleButton {
    width: 35px;
    height: 18px;
    margin-left: 5px;
    background-color: red;
    border: none;
    border-radius: 15px;
    position: relative;
    cursor: pointer;
}

#toggleButton:before {
    content: '';
    position: absolute;
    top: 3px;
    left: 5px;
    width: 12px;
    height: 12px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.3s, background-color 0.3s;
}

.toggle-on:before {
    transform: translateX(12px);
}

.warn_90 {
    color: red;
}

.village-duration, .village-caries, .village-arrive {
    display: block;
    margin-top: 0px;
    font-size: 87%;
    line-height: 11px;
}

.scavenge-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-left: 6px;
    border-radius: 50%;
    background-color: #c0392b; /* off */
    box-shadow: inset 0 0 2px rgba(0,0,0,0.6);
    vertical-align: middle;
}

.scavenge-indicator.active {
    background-color: #27ae60; /* on */
}
`;
GM_addStyle(customCSS);
