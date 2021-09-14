echo "Creating ZAP container"
docker run --detach --name zap -u zap -v "$(pwd)/reports":/zap/reports/:rw -i owasp/zap2docker-weekly

echo "Copying config files to the docker container"
docker exec zap mkdir /zap/wrk
docker cp .zap/config.xml zap:/zap/wrk/config.xml
docker cp .zap/loginScript.js zap:/zap/wrk/loginScript.js
docker cp .zap/scan.context zap:/zap/wrk/scan.context

echo "Starting ZAP deamon"
docker exec --detach -i -v zap zap.sh -daemon -host 0.0.0.0 -port 8080 -configfile /zap/wrk/config.xml  -config api.disablekey=true -addoninstall communityScripts

echo "Waiting for ZAP deamon to run"
sleep 15

echo "Verifying ZAP deamon"
docker exec zap zap-cli -v status

echo "Loading authentication script"
docker exec zap zap-cli -v scripts load -n "loginScript.js" -e "ECMAScript : Graal.js" -t authentication -f /zap/wrk/loginScript.js

echo "Loading scan context"
docker exec zap zap-cli -v context import /zap/wrk/scan.context

echo "Run Quick (baseline) scan"
docker exec zap zap-cli -v quick-scan $DAST_WEBSITE

echo "Exporting scan report XML & uploading as an artifact"
docker exec zap zap-cli report --output-format xml --output dastScanReport.xml
docker cp zap:/zap/dastScanReport.xml ./.zap/dastScanReport.xml
