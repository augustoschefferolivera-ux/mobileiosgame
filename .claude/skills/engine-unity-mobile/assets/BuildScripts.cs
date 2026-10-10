// BuildScripts.cs — coloque em Assets/_Game/Editor/ (pasta "Editor" para compilar só no Editor).
// Uso (batchmode):
//   Unity -batchmode -nographics -quit -projectPath . -executeMethod BuildScripts.BuildIOS \
//         -simulator -buildOutput production/build/ios-xcode -logFile build.log
// Flags lidas da linha de comando: -simulator (Simulator SDK), -buildOutput <dir>, -development.
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BuildScripts
{
    public static void BuildIOS()
    {
        string[] args = Environment.GetCommandLineArgs();
        bool simulator = args.Contains("-simulator");
        bool development = args.Contains("-development");
        string output = ArgValue(args, "-buildOutput") ?? "Builds/iOS";

        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.iOS, BuildTarget.iOS);
        PlayerSettings.iOS.sdkVersion = simulator ? iOSSdkVersion.SimulatorSDK : iOSSdkVersion.DeviceSDK;

        var scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
        if (scenes.Length == 0)
        {
            Debug.LogError("[BuildScripts] Nenhuma cena habilitada em Build Settings.");
            EditorApplication.Exit(2);
            return;
        }

        var options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = output,
            target = BuildTarget.iOS,
            options = development ? BuildOptions.Development : BuildOptions.None
        };

        Directory.CreateDirectory(output);
        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildSummary summary = report.summary;
        Debug.Log($"[BuildScripts] resultado={summary.result} sdk={(simulator ? "Simulator" : "Device")} " +
                  $"tamanho={summary.totalSize} bytes erros={summary.totalErrors} saida={output}");

        if (summary.result != BuildResult.Succeeded)
        {
            EditorApplication.Exit(1);
        }
    }

    private static string ArgValue(string[] args, string name)
    {
        int i = Array.IndexOf(args, name);
        return (i >= 0 && i + 1 < args.Length) ? args[i + 1] : null;
    }
}
