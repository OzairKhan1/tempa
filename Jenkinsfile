@Library('jShrLibs') _

pipeline {
    agent any

    environment {
        SERVICE       = "${env.BRANCH_NAME}"
        IMAGE_TAG     = "v${BUILD_NUMBER}"
        DOCKERHUB_NS  = "ozairkhan1"
        IMAGE         = "${DOCKERHUB_NS}/${SERVICE}:${IMAGE_TAG}"
        MANIFEST_REPO = "https://github.com/OzairKhan1/Kubernetes-ManifestFiles.git"
        MANIFEST_DIR  = "11-Microservices-Manifests"
    }

    stages {

        stage('Git Clone') {
            steps {
                gitClone("https://github.com/OzairKhan1/tempa.git", SERVICE, "git-creds")
            }
        }

        stage('GitLeaks') {
            steps {
                sh "gitleaks detect --source . --redact --exit-code 1"
            }
        }

     stage('SonarQube Analysis') {
    steps {
        withSonarQubeEnv('SonarQube') {
            withEnv(["PATH+SONAR=${tool 'SonarScanner'}/bin"]) {
                sh "sonar-scanner -Dsonar.projectKey=${SERVICE} -Dsonar.projectName=${SERVICE} -Dsonar.sources=."
                sh "find . -name report-task.txt -print"
            }
        }
    }
}

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy FS Scan') {
            steps {
                sh "trivy fs --severity HIGH,CRITICAL --exit-code 1 --no-progress ."
            }
        }

        stage('Tag Docker Image') {
            steps {
                sh "docker image inspect ozairkhan1/${SERVICE}:latest > /dev/null"
                sh "docker tag ozairkhan1/${SERVICE}:latest ${IMAGE}"
                sh "docker images ${IMAGE}"
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL --exit-code 1 --no-progress ${IMAGE}"
            }
        }

        stage('Push Docker Image') {
            steps {
                dockerPush("${IMAGE}", "dockerHub-creds")
            }
        }

        stage('Update Manifest Repo') {
            steps {
                dir('manifests') {

                    gitClone("${MANIFEST_REPO}", "main", "git-creds")

                    sh "sed -i 's#image: ${DOCKERHUB_NS}/${SERVICE}:.*#image: ${IMAGE}#g' ${MANIFEST_DIR}/${SERVICE}-deployment.yml"

                    withCredentials([usernamePassword(credentialsId: 'git-creds', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh "git config user.email 'jenkins@ci.local' && git config user.name 'jenkins-ci' && git add ${MANIFEST_DIR}/${SERVICE}-deployment.yml && git commit -m 'Update ${SERVICE} image to ${IMAGE_TAG} (build ${BUILD_NUMBER})' || true"
                        sh "git push https://${GIT_USER}:${GIT_PASS}@github.com/OzairKhan1/Kubernetes-ManifestFiles.git main"
                    }
                }
            }
        }
    }

    post {
        success {
            mail to: 'ozairk050@gmail.com',
                 subject: "Pipeline SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: """Hello,

The Jenkins pipeline job '${env.JOB_NAME}' has succeeded.

Service: ${SERVICE}
Docker image: ${IMAGE}
Build Number: ${env.BUILD_NUMBER}
Build URL: ${env.BUILD_URL}

The Kubernetes manifest repository has been updated successfully.

Regards,
Jenkins
"""
        }

        failure {
            mail to: 'ozairk050@gmail.com',
                 subject: "Pipeline FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: """Hello,

The Jenkins pipeline job '${env.JOB_NAME}' has failed.

Service: ${SERVICE}
Build Number: ${env.BUILD_NUMBER}
Build URL: ${env.BUILD_URL}

Please check the Jenkins console output for the failed stage.

Regards,
Jenkins
"""
        }
    }
}
