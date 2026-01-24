using Newtonsoft.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
[Table("restaurants")]
public class Restaurant : BaseModel
{
    [PrimaryKey("id", false)] // ★ false: DB 자동 생성이 아니라 우리가 직접(카카오ID) 넣겠다는 뜻
    [JsonProperty("id")]      // ★ 프론트엔드의 id와 DB의 id를 소프트웨어적으로 연결
    [Column("id")]
    public string Id { get; set; } = null!;

    [Column("name")]
    [JsonProperty("name")]
    public string Name { get; set; } = "정보 없음";

    [Column("address")]
    [JsonProperty("address")]
    public string Address { get; set; } = "주소 없음";

    [Column("x")]
    [JsonProperty("x")]
    public string? X { get; set; }

    [Column("y")]
    [JsonProperty("y")]
    public string? Y { get; set; }

    [Column("ack_count")]
    [JsonProperty("ack_count")]
    public int AckCount { get; set; }

    [Column("is_locked")]
    [JsonProperty("is_locked")]
    public bool IsLocked { get; set; } = false;
}

}