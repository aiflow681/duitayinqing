/**
 * 引擎 WebGL 加载器 (模拟版本)
 * 此文件模拟引擎 WebGL的加载器
 * 实际游戏逻辑在 TowerStack.framework.js 中实现
 */

function createUnityInstance(canvas, config, onProgress) {
    return new Promise(function(resolve, reject) {
        // 模拟加载进度
        var progress = 0;
        var loadingInterval = setInterval(function() {
            progress += 0.1;
            if (onProgress) {
                onProgress(Math.min(progress, 0.9));
            }
            
            if (progress >= 0.9) {
                clearInterval(loadingInterval);
                
                // 加载框架文件
                var frameworkScript = document.createElement('script');
                frameworkScript.src = config.frameworkUrl;
                frameworkScript.onload = function() {
                    if (onProgress) onProgress(1.0);
                    
                    // 模拟引擎实例对象
                    var unityInstance = {
                        SendMessage: function(gameObject, methodName, param) {
                            console.log("Unity.SendMessage:", gameObject, methodName, param);
                        },
                        SetFullscreen: function(val) {}
                    };
                    resolve(unityInstance);
                };
                frameworkScript.onerror = function() {
                    reject('无法加载游戏框架');
                };
                document.body.appendChild(frameworkScript);
            }
        }, 100);
    });
}
