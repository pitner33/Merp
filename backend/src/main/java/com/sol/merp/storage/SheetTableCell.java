package com.sol.merp.storage;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.*;

@Entity
@Table(name = "sheet_table_cell", indexes = {
        @Index(name = "idx_table_row", columnList = "tableName,rowKey"),
        @Index(name = "idx_table", columnList = "tableName")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SheetTableCell {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String tableName;

    @Column(nullable = false)
    private Integer rowKey;

    @Column(nullable = false)
    private Integer colOrder;

    @Column(columnDefinition = "TEXT")
    private String value;
}
