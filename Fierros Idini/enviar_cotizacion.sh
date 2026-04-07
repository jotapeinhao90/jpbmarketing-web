#!/bin/bash
# Automator de envío de cotizaciones vía Apple Mail
# Creado por Antigravity
# Acepta múltiples destinos separados por espacio.

PDF_PATH=$(realpath "$1")
shift
DESTINOS=("$@")

if [ ${#DESTINOS[@]} -eq 0 ]; then
    echo "Falta el correo de destino. Uso: ./enviar_cotizacion.sh archivo.pdf correo1@a.cl correo2@b.cl"
    exit 1
fi

RECIPIENTS_APPLESCRIPT=""
for DESTINO in "${DESTINOS[@]}"; do
    RECIPIENTS_APPLESCRIPT+="make new to recipient at end of to recipients with properties {address:\"$DESTINO\"}
"
done

osascript <<EOF
tell application "Mail"
    set newMessage to make new outgoing message with properties {subject:"Nueva Solicitud de Cotización de Materiales", content:"Estimado equipo de ventas,\n\nAdjunto solicitud de cotización interna para que por favor me entreguen precios de estos materiales.\n\nSaludos cordiales,\nEquipo de Marketing\n", visible:true}
    tell newMessage
        $RECIPIENTS_APPLESCRIPT
        tell content
            make new attachment with properties {file name:"$PDF_PATH" as POSIX file} at after the last paragraph
        end tell
    end tell
    activate
end tell
EOF
echo "Borrador de correo creado con éxito."
