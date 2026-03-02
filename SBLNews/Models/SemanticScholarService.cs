using System.Text.Json.Serialization;

namespace SBLNews.Models;

// The main response wrapper
public class PaperSearchResponse
{
    [JsonPropertyName("data")]
    public List<PaperData> Data { get; set; } = new();
}

// 2. The individual paper data
public class PaperData
{
    [JsonPropertyName("paperId")]
    public string PaperId { get; set; } = "";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("year")]
    public int? Year { get; set; }

    [JsonPropertyName("authors")]
    public List<AuthorData> Authors { get; set; } = new();
}

// The author data
public class AuthorData
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
}