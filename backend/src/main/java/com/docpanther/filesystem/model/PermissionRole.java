package com.docpanther.filesystem.model;

public enum PermissionRole {
    VIEWER, EDITOR, OWNER;

    // Higher ordinal = higher authority: VIEWER < EDITOR < OWNER
    public boolean includes(PermissionRole required) {
        return this.ordinal() >= required.ordinal();
    }

    public String toApiRole() {
        return switch (this) {
            case VIEWER -> "VIEW";
            case EDITOR -> "EDIT";
            case OWNER  -> "OWNER";
        };
    }

    public static PermissionRole fromApiRole(String apiRole) {
        return switch (apiRole) {
            case "VIEW"  -> VIEWER;
            case "EDIT"  -> EDITOR;
            case "OWNER" -> OWNER;
            default -> throw new IllegalArgumentException("Unknown permission: " + apiRole);
        };
    }
}
